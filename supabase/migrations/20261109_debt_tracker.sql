-- Run after the existing Montra migrations. Loans are manual records; no bank transfer is made.
create table if not exists public.montra_debts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 100),
 direction text not null check(direction in ('owed_by_me','owed_to_me')),
 principal numeric(14,2) not null check(principal > 0),
 currency text not null check(currency ~ '^[A-Z]{3}$'),
 due_date date,
 note text not null default '' check(length(note)<=500),
 created_at timestamptz not null default now(),
 unique(id,user_id)
);
create table if not exists public.montra_debt_payments (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 debt_id uuid not null,
 amount numeric(14,2) not null check(amount > 0),
 paid_on date not null default current_date,
 created_at timestamptz not null default now(),
 foreign key(debt_id,user_id) references public.montra_debts(id,user_id) on delete cascade
);
alter table public.montra_debts enable row level security;
alter table public.montra_debt_payments enable row level security;
create policy montra_debts_owner on public.montra_debts for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy montra_debt_payments_owner on public.montra_debt_payments for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.montra_debts to authenticated;
grant select,insert,delete on public.montra_debt_payments to authenticated;
-- Serializes concurrent inserts for one debt, and refuses overpayment.
create or replace function public.montra_validate_debt_payment() returns trigger
language plpgsql security invoker set search_path=public as $$
declare principal_amount numeric(14,2); already_paid numeric(14,2);
begin
 select principal into principal_amount from public.montra_debts
 where id=new.debt_id and user_id=auth.uid() for update;
 if not found then raise exception 'Debt not found'; end if;
 select coalesce(sum(amount),0) into already_paid from public.montra_debt_payments where debt_id=new.debt_id;
 if already_paid+new.amount>principal_amount then raise exception 'Payment exceeds remaining debt'; end if;
 return new;
end $$;
drop trigger if exists montra_debt_payment_limit on public.montra_debt_payments;
create trigger montra_debt_payment_limit before insert on public.montra_debt_payments for each row execute function public.montra_validate_debt_payment();
