-- Demo-only connected accounts. No real bank credentials or payment authorization.
create table if not exists public.montra_connected_accounts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 provider text not null check (provider in ('egypt_bank_mock','paypal_mock')),
 display_name text not null check (char_length(display_name) between 1 and 80),
 mode text not null default 'mock' check (mode='mock'),
 created_at timestamptz not null default now(),
 unique(id,user_id),unique(user_id,provider)
);
create table if not exists public.montra_synced_transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 account_id uuid not null,
 external_id text not null check (char_length(external_id) between 4 and 80),
 booked_on date not null,
 description text not null check (char_length(description) between 1 and 200),
 amount numeric(14,2) not null check (amount <> 0),
 currency text not null check (currency in ('EGP','USD')),
 category text not null,
 direction text not null check (direction in ('income','expense')),
 status text not null default 'demo' check (status='demo'),
 created_at timestamptz not null default now(),
 foreign key(account_id,user_id) references public.montra_connected_accounts(id,user_id) on delete cascade,
 unique(account_id,external_id),
 check ((amount<0 and direction='expense') or (amount>0 and direction='income'))
);
create index if not exists montra_synced_transactions_user_date on public.montra_synced_transactions(user_id,booked_on desc);
alter table public.montra_connected_accounts enable row level security;
alter table public.montra_synced_transactions enable row level security;
revoke all on public.montra_connected_accounts from anon;
revoke all on public.montra_synced_transactions from anon;
grant select,insert,delete on public.montra_connected_accounts to authenticated;
grant select,insert on public.montra_synced_transactions to authenticated;
drop policy if exists montra_mock_accounts_own on public.montra_connected_accounts;
create policy montra_mock_accounts_own on public.montra_connected_accounts for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid() and mode='mock');
drop policy if exists montra_mock_transactions_read on public.montra_synced_transactions;
create policy montra_mock_transactions_read on public.montra_synced_transactions for select to authenticated using (user_id=auth.uid());
drop policy if exists montra_mock_transactions_insert on public.montra_synced_transactions;
create policy montra_mock_transactions_insert on public.montra_synced_transactions for insert to authenticated with check (user_id=auth.uid() and status='demo');
