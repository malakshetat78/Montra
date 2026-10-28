create table public.montra_assets (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 80),
 kind text not null check (kind in ('Gold','Stock','Other')),
 quantity numeric not null check (quantity > 0),
 unit text not null check (length(trim(unit)) between 1 and 30),
 unit_price numeric not null check (unit_price >= 0),
 previous_unit_price numeric check (previous_unit_price is null or previous_unit_price >= 0),
 goal_id uuid references public.montra_goals(id) on delete set null,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create index montra_assets_user_id_idx on public.montra_assets(user_id);
alter table public.montra_assets enable row level security;
grant select, insert, update, delete on public.montra_assets to authenticated;
create policy montra_assets_own on public.montra_assets for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and (goal_id is null or exists (select 1 from public.montra_goals g where g.id = goal_id and g.user_id = (select auth.uid()))));
