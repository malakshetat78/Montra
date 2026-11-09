-- Server-verified PayPal sandbox transactions, separated from real ledgers and mock transactions.
create table if not exists public.montra_paypal_sandbox_transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 external_id text not null check (length(external_id) between 1 and 120),
 booked_on date not null,
 description text not null,
 amount numeric(14,2) not null check(amount<>0),
 currency text not null check(currency in ('USD','EGP')),
 direction text not null check(direction in ('income','expense')),
 provider_status text not null,
 raw_type text not null default '',
 source text not null default 'paypal_sandbox' check(source='paypal_sandbox'),
 synced_at timestamptz not null default now(),
 unique(user_id,external_id)
);
alter table public.montra_paypal_sandbox_transactions enable row level security;
revoke all on public.montra_paypal_sandbox_transactions from anon,authenticated;
grant select on public.montra_paypal_sandbox_transactions to authenticated;
create policy montra_paypal_sandbox_own_read on public.montra_paypal_sandbox_transactions for select to authenticated using(user_id=auth.uid());
-- Only trusted Edge Function using service role may insert/update; users cannot forge provider-verified records.
