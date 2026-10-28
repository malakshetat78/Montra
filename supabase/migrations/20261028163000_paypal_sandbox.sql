create table public.montra_sandbox_orders (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 goal_id uuid references public.montra_goals(id) on delete set null,
 symbol text not null check(symbol ~ '^[A-Z0-9.^_-]{1,30}$'),
 amount_usd numeric(12,2) not null check(amount_usd>=1 and amount_usd<=10000),
 quote_usd numeric not null check(quote_usd>0), quote_time timestamptz not null,
 quantity numeric not null check(quantity>0), ledger_currency text not null, fx_rate numeric not null check(fx_rate>0),
 status text not null default 'review' check(status in ('review','awaiting_approval','simulated_filled')),
 paypal_order_id text unique, capture_id text unique, approval_url text,
 created_at timestamptz not null default now(), completed_at timestamptz,
 check(status<>'simulated_filled' or (capture_id is not null and completed_at is not null))
);
alter table public.montra_sandbox_orders enable row level security;
create policy sandbox_orders_read_own on public.montra_sandbox_orders for select to authenticated using ((select auth.uid())=user_id);
grant select on public.montra_sandbox_orders to authenticated;
revoke insert,update,delete on public.montra_sandbox_orders from anon,authenticated;
create index on public.montra_sandbox_orders(user_id,created_at desc);
create function public.montra_paypal_sandbox_secrets() returns jsonb language sql security definer set search_path='' as $$select coalesce(jsonb_object_agg(name,decrypted_secret),'{}'::jsonb) from vault.decrypted_secrets where name in ('montra_paypal_sandbox_client_id','montra_paypal_sandbox_client_secret','montra_twelvedata_key')$$;
revoke all on function public.montra_paypal_sandbox_secrets() from public,anon,authenticated;
grant execute on function public.montra_paypal_sandbox_secrets() to service_role;
create function public.montra_complete_sandbox_order(draft_id uuid,owner_id uuid,provider_order text,provider_capture text) returns void language plpgsql security definer set search_path='' as $$declare item public.montra_sandbox_orders%rowtype;begin
 select * into item from public.montra_sandbox_orders where id=draft_id for update;
 if not found or item.user_id<>owner_id or item.paypal_order_id is distinct from provider_order then raise exception 'Order mismatch';end if;
 if item.status='simulated_filled' then if item.capture_id<>provider_capture then raise exception 'Capture mismatch';end if;return;end if;
 if item.status<>'awaiting_approval' or nullif(provider_capture,'') is null then raise exception 'Invalid capture';end if;
 update public.montra_sandbox_orders set status='simulated_filled',capture_id=provider_capture,completed_at=now() where id=draft_id;
end$$;
revoke all on function public.montra_complete_sandbox_order(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.montra_complete_sandbox_order(uuid,uuid,text,text) to service_role;
