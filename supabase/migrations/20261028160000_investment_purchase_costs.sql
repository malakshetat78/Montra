alter table public.montra_assets
  add column purchase_price numeric,
  add column purchase_date date,
  add column purchase_fees numeric not null default 0,
  add constraint montra_asset_purchase_price_valid check (purchase_price is null or (purchase_price >= 0 and purchase_price < 1000000000000000)),
  add constraint montra_asset_purchase_fees_valid check (purchase_fees >= 0 and purchase_fees < 1000000000000000);
comment on column public.montra_assets.purchase_price is 'Average acquisition price per unit in the asset ledger currency; null means unknown. Fees excluded.';
comment on column public.montra_assets.purchase_fees is 'Total acquisition fees for the current holding, in the asset ledger currency.';
