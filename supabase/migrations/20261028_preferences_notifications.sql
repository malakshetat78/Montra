alter table public.montra_profiles
 add column country_code text not null default 'EG' check (country_code ~ '^[A-Z]{2}$'),
 add column base_currency text not null default 'EGP' check (base_currency ~ '^[A-Z]{3}$'),
 add column income_currency text not null default 'EGP' check (income_currency ~ '^[A-Z]{3}$'),
 add column email_notifications boolean not null default false;
create or replace function public.montra_currency() returns text language sql stable security invoker set search_path='' as $$ select coalesce((select base_currency from public.montra_profiles where user_id=(select auth.uid())), 'EGP') $$;
revoke all on function public.montra_currency() from public,anon;
grant execute on function public.montra_currency() to authenticated;
do $$ declare t text; begin foreach t in array array['montra_expenses','montra_goals','montra_budgets','montra_income_sources','montra_commitments','montra_assets'] loop
 execute format('alter table public.%I add column currency text not null default ''EGP'' check (currency ~ ''^[A-Z]{3}$'')',t);
 execute format('alter table public.%I alter column currency set default public.montra_currency()',t);
 end loop; end $$;
alter table public.montra_assets add column market text not null default 'EG' check (length(market) between 2 and 20), add column symbol text not null default '' check (length(symbol)<=30);
-- Existing entries stay in EGP; a different base currency opens a separate ledger.
create table public.montra_notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 event_key text not null, title text not null check(length(title)<=160), body text not null check(length(body)<=1000),
 kind text not null check(kind in ('budget','asset','goal','test')), destination text not null default 'overview' check(destination in ('overview','budgets','goals','settings')),
 created_at timestamptz not null default now(), read_at timestamptz,
 unique(user_id,event_key)
);
create index montra_notifications_user_created_idx on public.montra_notifications(user_id,created_at desc);
alter table public.montra_notifications enable row level security;
grant select on public.montra_notifications to authenticated;
grant update(read_at) on public.montra_notifications to authenticated;
create policy montra_notifications_read on public.montra_notifications for select to authenticated using((select auth.uid())=user_id);
create policy montra_notifications_mark on public.montra_notifications for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create table public.montra_push_subscriptions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 endpoint text not null unique check(length(endpoint)<=2048 and endpoint ~ '^https://'),
 p256dh text not null check(length(p256dh) between 40 and 200), auth text not null check(length(auth) between 10 and 100),
 created_at timestamptz not null default now(), unique(user_id,endpoint)
);
alter table public.montra_push_subscriptions enable row level security;
grant select,insert,delete on public.montra_push_subscriptions to authenticated;
grant update(p256dh,auth) on public.montra_push_subscriptions to authenticated;
create policy montra_push_own on public.montra_push_subscriptions for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create schema if not exists montra_private;
revoke all on schema montra_private from public,anon,authenticated;
create table montra_private.notification_queue (
 notification_id uuid primary key references public.montra_notifications(id) on delete cascade,
 attempts int not null default 0, locked_until timestamptz, push_done boolean not null default false, email_done boolean not null default false,
 completed_at timestamptz,last_error text
);
create function montra_private.queue_notification() returns trigger language plpgsql security definer set search_path='' as $$begin insert into montra_private.notification_queue(notification_id) values(new.id) on conflict do nothing; return new; end$$;
create trigger montra_notification_queue after insert on public.montra_notifications for each row execute function montra_private.queue_notification();
revoke all on function montra_private.queue_notification() from public,anon,authenticated;
create function public.montra_delivery_claim() returns jsonb language plpgsql security definer set search_path='' as $$declare out_rows jsonb; begin
 with selected as (select q.notification_id from montra_private.notification_queue q where q.completed_at is null and q.attempts<5 and (q.locked_until is null or q.locked_until<now()) order by q.notification_id for update skip locked limit 25), claimed as (update montra_private.notification_queue q set attempts=q.attempts+1,locked_until=now()+interval '2 minutes' from selected s where s.notification_id=q.notification_id returning q.*)
 select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('notification',to_jsonb(n))),'[]'::jsonb) into out_rows from claimed c join public.montra_notifications n on n.id=c.notification_id;return out_rows;end$$;
create function public.montra_delivery_finish(nid uuid,push_ok boolean,email_ok boolean,issue text default null) returns void language sql security definer set search_path='' as $$update montra_private.notification_queue set push_done=push_done or push_ok,email_done=email_done or email_ok,last_error=left(issue,200),locked_until=now()+interval '2 minutes',completed_at=case when (push_done or push_ok) and (email_done or email_ok) then now() else null end where notification_id=nid$$;
create function public.montra_delivery_secrets() returns jsonb language sql security definer set search_path='' as $$ select coalesce(jsonb_object_agg(name,decrypted_secret),'{}'::jsonb) from vault.decrypted_secrets where name in ('montra_vapid_public','montra_vapid_private','montra_job_token','montra_email_api_key','montra_email_from') $$;
revoke all on function public.montra_delivery_claim(),public.montra_delivery_finish(uuid,boolean,boolean,text),public.montra_delivery_secrets() from public,anon,authenticated;
grant execute on function public.montra_delivery_claim(),public.montra_delivery_finish(uuid,boolean,boolean,text),public.montra_delivery_secrets() to service_role;
create function montra_private.budget_notifications() returns trigger language plpgsql security definer set search_path='' as $$declare b record; spent numeric; pct numeric; level int; curr text; uid uuid; cat text; begin
 uid=new.user_id;curr=new.currency;cat=lower(trim(new.category));
 for b in select * from public.montra_budgets where user_id=uid and currency=curr and lower(trim(category))=cat loop
 select coalesce(sum(amount),0) into spent from public.montra_expenses where user_id=uid and currency=curr and lower(trim(category))=cat and expense_date>=date_trunc('month',current_date)::date and expense_date<(date_trunc('month',current_date)+interval '1 month')::date;
 pct=spent/b.budget_limit*100;level=case when pct>=100 then 100 when pct>=80 then 80 else 0 end;
 if level>0 then insert into public.montra_notifications(user_id,event_key,title,body,kind,destination) values(uid,'budget:'||b.id||':'||to_char(current_date,'YYYY-MM')||':'||level,case when level=100 then 'Budget limit reached' else 'Budget nearly reached' end,b.category||': '||round(pct)||'% used. '||curr||' '||round(spent,2)||' of '||round(b.budget_limit,2)||'.','budget','budgets') on conflict(user_id,event_key) do nothing;end if; end loop;return new;end$$;
create trigger montra_expense_budget_notice after insert or update on public.montra_expenses for each row execute function montra_private.budget_notifications();
create trigger montra_budget_notice after insert or update on public.montra_budgets for each row execute function montra_private.budget_notifications();
create function montra_private.goal_progress_notice(uid uuid,gid uuid) returns void language plpgsql security definer set search_path='' as $$declare g record; total_saved numeric;pct numeric;level int; begin
 select * into g from public.montra_goals where id=gid and user_id=uid;if not found then return;end if;
 select g.saved+coalesce(sum(quantity*unit_price),0) into total_saved from public.montra_assets where goal_id=gid and user_id=uid and currency=g.currency;
 pct=total_saved/g.target*100;level=case when pct>=100 then 100 when pct>=75 then 75 when pct>=50 then 50 else 0 end;
 if level>0 then insert into public.montra_notifications(user_id,event_key,title,body,kind,destination) values(uid,'goal:'||gid||':'||level,case when level=100 then 'Goal reached!' else 'Goal milestone' end,g.name||': '||round(pct)||'% funded, including linked assets.','goal','goals') on conflict(user_id,event_key) do nothing;end if;end$$;
create function montra_private.asset_notifications() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op='UPDATE' and new.unit_price<>old.unit_price then insert into public.montra_notifications(user_id,event_key,title,body,kind,destination) values(new.user_id,'asset:'||new.id||':'||gen_random_uuid(),'Asset value updated',new.name||': unit price changed from '||old.currency||' '||old.unit_price||' to '||new.currency||' '||new.unit_price||'. Updated holding value: '||new.currency||' '||round(new.quantity*new.unit_price,2)||'.','asset','goals');end if;
 if new.goal_id is not null then perform montra_private.goal_progress_notice(new.user_id,new.goal_id);end if;return new;end$$;
create trigger montra_asset_notice after insert or update on public.montra_assets for each row execute function montra_private.asset_notifications();
create function montra_private.goal_notifications() returns trigger language plpgsql security definer set search_path='' as $$begin perform montra_private.goal_progress_notice(new.user_id,new.id);return new;end$$;
create trigger montra_goal_notice after insert or update on public.montra_goals for each row execute function montra_private.goal_notifications();
revoke all on function montra_private.budget_notifications(),montra_private.asset_notifications(),montra_private.goal_notifications(),montra_private.goal_progress_notice(uuid,uuid) from public,anon,authenticated;
create function public.montra_test_notification() returns void language plpgsql security definer set search_path='' as $$declare uid uuid:=auth.uid();begin
 if uid is null then raise exception 'Sign in required';end if;
 if exists(select 1 from public.montra_notifications where user_id=uid and kind='test' and created_at>now()-interval '1 minute') then raise exception 'Wait one minute before sending another test';end if;
 insert into public.montra_notifications(user_id,event_key,title,body,kind,destination) values(uid,'test:'||gen_random_uuid(),'Notifications are ready','This is a test notification from Montra.','test','settings');end$$;
revoke all on function public.montra_test_notification() from public,anon;
grant execute on function public.montra_test_notification() to authenticated;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
-- Additional currency integrity and least-privilege grants.
alter table public.montra_budgets drop constraint montra_budgets_user_id_category_key, add constraint montra_budgets_user_currency_category_key unique(user_id,currency,category);
alter policy montra_assets_own on public.montra_assets with check((select auth.uid())=user_id and (goal_id is null or exists(select 1 from public.montra_goals g where g.id=goal_id and g.user_id=(select auth.uid()) and g.currency=montra_assets.currency)));
create table public.montra_delivery_receipts(notification_id uuid not null references public.montra_notifications(id) on delete cascade,subscription_id uuid not null references public.montra_push_subscriptions(id) on delete cascade,sent_at timestamptz not null default now(),primary key(notification_id,subscription_id));
alter table public.montra_delivery_receipts enable row level security;
revoke all on public.montra_delivery_receipts from anon,authenticated;
grant all on public.montra_delivery_receipts to service_role;
revoke all on public.montra_notifications from anon,authenticated;
grant select on public.montra_notifications to authenticated;
grant update(read_at) on public.montra_notifications to authenticated;
revoke all on public.montra_push_subscriptions from anon,authenticated;
grant select,insert,delete on public.montra_push_subscriptions to authenticated;
grant update(p256dh,auth) on public.montra_push_subscriptions to authenticated;
