# Automatic market valuations

The production `montra-market-sync` function runs from pg_cron approximately every five minutes. It authenticates the scheduler using `montra_job_token` in Supabase Vault; platform JWT verification is disabled because it uses its own authentication. The endpoint does not accept unsigned or browser-triggered sync requests.

## Working without an API key

- Gold: `https://api.gold-api.com/price/XAU`, international USD spot per troy ounce.
- FX: `https://open.er-api.com/v6/latest/USD`, daily reference rates, cached for 12 hours. The UI links to ExchangeRate-API for attribution.
- Formula: USD/oz ÷ 31.1034768 × karat/24 × USD-to-ledger rate.
- Supported automatic gold purities: 14, 18, 21, 22 and 24 karat. Quantities must be grams.
- This is a converted international spot reference, **not an Egypt retail or buyback quote**. It excludes workmanship and dealer premiums. FX and metal observation timestamps are shown separately.

Gold quotes older than 30 minutes, FX observations older than three days, future timestamps, invalid currencies and non-positive/invalid prices do not replace the last valid asset value.

## Optional providers

Store keys encrypted in Supabase Vault; never place them in the frontend, chat, URLs or repository:

- `montra_gold_egypt_key`: Gold Timo API key. Adapter: `/api/v1/price/XAU/EGP/{karat}`, header `x-api-key`. The `gram` field is used as the provider's per-gram reference, not a guaranteed resale price.
- `montra_twelvedata_key`: Twelve Data API key with exchange coverage and app display rights. Adapter: `/quote`, header `Authorization: apikey ...`. Markets configured in this version: Egypt XCAI, US, UK XLON, Saudi XSAU and UAE XDFM. An API key alone does not guarantee exchange entitlement. The API's source timestamp and market-closed flag are respected; prices may be delayed. Unknown symbols or unentitled exchanges remain unavailable rather than receiving fabricated values.

Provider availability is published through `montra_market_status`; private keys remain accessible only by the service-role RPC. The app disables unconfigured provider choices.

## Notifications

The first valid automatic quote establishes an alert baseline without sending a price-change notification. Later changes accumulate from the last alert baseline. When the user-defined threshold is crossed (default 2%), a notification is created; at most one price alert per asset per hour. It uses the existing notification inbox and optional Web Push/email pipeline. Goal milestones continue to use current linked asset valuations.

Failed refreshes keep the last known price and show an error/stale status. Quantities, names and goal information are not sent to price providers. Only requested instruments and quote currencies are used. Manual assets are not changed by the scheduled updater.

The updater processes the oldest checked assets first, up to eight distinct instrument/configuration groups per run, and caches stock quotes for 15 minutes. This bounds provider calls; many holdings may take additional runs. Markets and plan limits can further delay quotes.

## Schedule

```sql
select cron.schedule('montra-market-sync','*/5 * * * *',$job$
 select net.http_post(
  url:='https://wkulplqfmjbjgszgofva.supabase.co/functions/v1/montra-market-sync',
  headers:=jsonb_build_object('Content-Type','application/json','x-montra-job',
    (select decrypted_secret from vault.decrypted_secrets where name='montra_job_token')),
  body:='{}'::jsonb,timeout_milliseconds:=60000);
$job$);
```

## Checks

`node tests/market-pricing.test.mjs` verifies gold purity, gram conversion, FX conversion, source freshness and exchange selection. Database transaction tests (rolled back) verified the initial baseline, cumulative threshold, one-hour cooldown and rejection of outdated asset configuration.

Configured currency provider: ExchangeRate-API standard endpoint using server-only Vault `montra_exchangerate_key` and Bearer authentication. Responses normalize `conversion_rates` to `rates`, cached 12 hours; open endpoint remains fallback. Never place the key in source or the browser.
