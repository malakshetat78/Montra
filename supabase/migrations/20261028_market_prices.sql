alter table public.montra_assets
 add column quote_source text not null default 'manual' check(quote_source in ('manual','gold_spot','gold_egypt','twelve_data')),
 add column gold_karat smallint not null default 21 check(gold_karat in (14,18,21,22,24)),
 add column price_updated_at timestamptz,
 add column fx_updated_at timestamptz,
 add column quote_status text not null default 'manual' check(quote_status in ('manual','pending','fresh','closed','stale','error','unavailable')),
 add column quote_note text not null default '' check(length(quote_note)<=400),
 add column alert_percent numeric not null default 2 check(alert_percent>=0.1 and alert_percent<=100),
 add column alert_anchor_price numeric check(alert_anchor_price is null or alert_anchor_price>0),
 add column last_alert_at timestamptz;
create table public.montra_market_cache(key text primary key,payload jsonb not null,fetched_at timestamptz not null default now());
alter table public.montra_market_cache enable row level security;
revoke all on public.montra_market_cache from anon,authenticated;
grant select on public.montra_market_cache to authenticated;
create policy montra_market_cache_read on public.montra_market_cache for select to authenticated using(true);
create table public.montra_market_status(id boolean primary key default true check(id),gold_spot_ready boolean not null default true,gold_egypt_ready boolean not null default false,stocks_ready boolean not null default false,checked_at timestamptz);
insert into public.montra_market_status(id) values(true);
alter table public.montra_market_status enable row level security;
revoke all on public.montra_market_status from anon,authenticated;
grant select on public.montra_market_status to authenticated;
create policy montra_market_status_read on public.montra_market_status for select to authenticated using(true);
grant all on public.montra_market_cache,public.montra_market_status to service_role;
create function public.montra_market_secrets() returns jsonb language sql security definer set search_path='' as $$select coalesce(jsonb_object_agg(name,decrypted_secret),'{}'::jsonb) from vault.decrypted_secrets where name in ('montra_job_token','montra_gold_egypt_key','montra_twelvedata_key')$$;
revoke all on function public.montra_market_secrets() from public,anon,authenticated;
grant execute on function public.montra_market_secrets() to service_role;
create function public.montra_apply_quote(aid uuid,source text,karat int,ticker text,asset_market text,ledger_currency text,price numeric,quote_time timestamptz,fx_time timestamptz,market_closed boolean,note text) returns boolean language plpgsql security definer set search_path='' as $$declare a public.montra_assets%rowtype;anchor numeric;send_alert boolean;begin
 select * into a from public.montra_assets where id=aid for update;
 if not found or a.quote_source<>source or a.gold_karat<>karat or a.symbol<>ticker or a.market<>asset_market or a.currency<>ledger_currency then return false;end if;
 if price is null or price<=0 or quote_time is null or quote_time>now()+interval '5 minutes' then return false;end if;
 if a.price_updated_at is not null and quote_time<a.price_updated_at then return false;end if;
 anchor=coalesce(a.alert_anchor_price,price);
 send_alert=a.price_updated_at is not null and abs(price-anchor)/anchor*100>=a.alert_percent and (a.last_alert_at is null or a.last_alert_at<now()-interval '1 hour');
 update public.montra_assets set previous_unit_price=case when unit_price<>price then unit_price else previous_unit_price end,unit_price=price,price_updated_at=quote_time,fx_updated_at=fx_time,quote_status=case when market_closed then 'closed' else 'fresh' end,quote_note=left(note,400),alert_anchor_price=case when send_alert then price else anchor end,last_alert_at=case when send_alert then now() else last_alert_at end,updated_at=now() where id=aid;
 return true;end$$;
revoke all on function public.montra_apply_quote(uuid,text,int,text,text,text,numeric,timestamptz,timestamptz,boolean,text) from public,anon,authenticated;
grant execute on function public.montra_apply_quote(uuid,text,int,text,text,text,numeric,timestamptz,timestamptz,boolean,text) to service_role;
create or replace function montra_private.asset_notifications() returns trigger language plpgsql security definer set search_path='' as $$declare anchor numeric;change_pct numeric;begin
 if tg_op='UPDATE' and new.unit_price<>old.unit_price then
 if new.quote_source='manual' then
 insert into public.montra_notifications(user_id,event_key,title,body,kind,destination) values(new.user_id,'asset:'||new.id||':'||gen_random_uuid(),'Asset value updated',new.name||': unit price changed from '||old.currency||' '||old.unit_price||' to '||new.currency||' '||new.unit_price||'. Updated holding value: '||new.currency||' '||round(new.quantity*new.unit_price,2)||'.','asset','goals');
 elsif new.quote_status in ('fresh','closed') and old.price_updated_at is not null and new.last_alert_at is distinct from old.last_alert_at then
 anchor=coalesce(old.alert_anchor_price,old.unit_price);change_pct=(new.unit_price-anchor)/nullif(anchor,0)*100;
 insert into public.montra_notifications(user_id,event_key,title,body,kind,destination) values(new.user_id,'market:'||new.id||':'||gen_random_uuid(),case when change_pct>=0 then 'Asset price increased' else 'Asset price decreased' end,new.name||': '||round(abs(change_pct),2)||'% '||case when change_pct>=0 then 'above' else 'below' end||' the previous alert baseline. Current holding reference value: '||new.currency||' '||round(new.quantity*new.unit_price,2)||'. Open your goal to see its updated progress.','asset','goals');
 end if;end if;
 if new.goal_id is not null then perform montra_private.goal_progress_notice(new.user_id,new.goal_id);end if;return new;end$$;
