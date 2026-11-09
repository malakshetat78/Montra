-- Apply once in Supabase SQL editor before enabling the recurring UI.
create table if not exists public.montra_recurring_rules (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 80),
 amount numeric(14,2) not null check(amount > 0),
 category text not null check(length(trim(category)) between 1 and 40),
 method text not null default 'Cash' check(method in ('Cash','PayPal')),
 due_day smallint not null check(due_day between 1 and 31),
 currency text not null default 'EGP' check(currency ~ '^[A-Z]{3}$'),
 kind text not null default 'bill' check(kind in ('bill','subscription','other')),
 active boolean not null default true,
 start_month date not null default date_trunc('month',current_date)::date,
 created_at timestamptz not null default now()
);
alter table public.montra_recurring_rules enable row level security;
create policy montra_recurring_rules_own on public.montra_recurring_rules for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
grant select,insert,update,delete on public.montra_recurring_rules to authenticated;
-- Idempotency for recurring entries; unique constraint prevents double posting.
alter table public.montra_expenses add column if not exists recurring_rule_id uuid references public.montra_recurring_rules(id) on delete set null;
alter table public.montra_expenses add column if not exists recurring_month date;
create unique index if not exists montra_recurring_expense_once on public.montra_expenses(user_id,recurring_rule_id,recurring_month) where recurring_rule_id is not null;
create or replace function public.montra_post_recurring(p_rule uuid, p_month date)
returns boolean language plpgsql security invoker set search_path = public as $$
declare r public.montra_recurring_rules%rowtype; d date; n integer;
begin
 if p_month is null or p_month <> date_trunc('month',p_month)::date then raise exception 'Month must be first day'; end if;
 if p_month > date_trunc('month',current_date)::date or p_month < (date_trunc('month',current_date)-interval '12 months')::date then raise exception 'Month outside allowed range'; end if;
 select * into r from public.montra_recurring_rules where id=p_rule and user_id=auth.uid() and active=true and start_month<=p_month;
 if not found then raise exception 'Rule unavailable'; end if;
 d := p_month + (least(r.due_day,extract(day from (p_month+interval '1 month - 1 day'))::integer)-1);
 if d>current_date then raise exception 'Payment is not due yet'; end if;
 insert into public.montra_expenses(user_id,merchant,amount,expense_date,method,category,note,currency,recurring_rule_id,recurring_month)
 values(auth.uid(),r.name,r.amount,d,r.method,r.category,'Recurring: '||r.kind,r.currency,r.id,p_month)
 on conflict (user_id,recurring_rule_id,recurring_month) where recurring_rule_id is not null do nothing;
 get diagnostics n = row_count;
 return n=1;
end $$;
grant execute on function public.montra_post_recurring(uuid,date) to authenticated;
