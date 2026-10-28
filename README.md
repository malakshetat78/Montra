# Montra

Personal finance app with cash/manual PayPal expenses, category budgets, income and commitments, savings forecasts, gold/investment tracking, and notifications.

Live app: https://montra-finance.khaledshetat4.chatgpt.site

## Run locally

```sh
python -m http.server 8000
```

Open http://localhost:8000. The root index.html, locales.js, sw.js and logo.png form a buildless static app. Supabase provides authentication, storage and server functions. Browser publishable keys are public by design; database RLS protects user records.

## Backend

- supabase/schema.sql is the initial reconstructed schema; apply only to a new empty database, then review/apply subsequent migrations in order. Existing production databases already have these changes: do not replay migrations blindly.
- supabase/migrations contains asset tracking, country/currency ledgers, notification infrastructure, market prices and immediate first-quote triggers.
- supabase/functions/montra-market-sync fetches prices and values holdings.
- supabase/functions/montra-notifications delivers queued Web Push and optional email notifications.
- See each function README for Vault secrets, authentication and schedules. Enable pg_net and pg_cron, configure Auth site/redirect URLs and function CORS for your deployment. Project URLs in deployment SQL need replacing for a new project.
- Provider keys, VAPID private keys and job tokens belong in Supabase Vault. No secret values or customer data are included here.

## Features and limits

- Goals include linked asset valuations and estimated savings; forecasts are estimates, not guarantees.
- International gold reference: USD per troy ounce converted to grams, purity and ledger currency. It is not an Egyptian shop/buyback quote and excludes workmanship.
- First automatic quote is requested when an asset is created or its pricing configuration changes; periodic synchronization runs every five minutes. Pending assets are checked in the visible page every two seconds.
- ExchangeRate-API account endpoint uses a server-only key, 12-hour cache and a public-endpoint fallback. Daily FX can differ from bank transaction rates.
- Local Egyptian gold and stock adapters require provider keys and suitable exchange coverage; these are currently unconfigured.
- Price alerts use a cumulative percentage threshold and at most one alert per holding per hour. Web Push requires browser permission and device support. Email requires a configured provider and verified sender.
- Cash and PayPal expenses are manually entered. PayPal synchronization is not connected.
- Switching base currency selects a separate ledger; it does not convert historical entries.

## Validation

```sh
node tests/market-pricing.test.mjs
```

Tests cover purity, grams, cross-currency conversion, invalid/stale prices and market selection. Database integration checks were also performed with rolled-back test data. Device Web Push receipt was confirmed by the user.
