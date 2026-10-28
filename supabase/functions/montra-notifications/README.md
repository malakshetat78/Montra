# Montra notifications

The deployed Edge Function authenticates every request itself. User requests require a valid Supabase user access token; scheduled requests require a private job token. The function is deployed with platform JWT verification disabled because the scheduler uses this separate token. Never remove its internal authentication.

## Secrets

VAPID keys and the scheduler token are stored encrypted in Supabase Vault, never in the website or repository. The `montra_delivery_secrets` RPC is executable by `service_role` only.

Required Vault names: `montra_vapid_public`, `montra_vapid_private`, `montra_job_token`.

Optional email Vault names: `montra_email_api_key` (Resend API key), `montra_email_from` (a sender on a verified domain). Without both, the website shows email delivery as unavailable and does not let users enable it. Verify the sender with the provider before enabling email.

Use the same VAPID key pair for the lifetime of existing subscriptions. To replace keys, unsubscribe affected devices and ask users to subscribe again.

## Scheduler

The production database has a `montra-notification-delivery` pg_cron job every minute. It calls the function with the job token read from Vault. Create the job only after secrets and the function are configured:

```sql
select cron.schedule('montra-notification-delivery','* * * * *', $job$
select net.http_post(
 url:='https://wkulplqfmjbjgszgofva.supabase.co/functions/v1/montra-notifications',
 headers:=jsonb_build_object('Content-Type','application/json','x-montra-job',
   (select decrypted_secret from vault.decrypted_secrets where name='montra_job_token')),
 body:='{}'::jsonb, timeout_milliseconds:=60000);
$job$);
```

The queue claims at most 25 updates per run, retries transient failures up to five times, uses push receipts and email idempotency keys, and removes expired subscriptions. Delivery may be delayed by browser, network or provider conditions.

## Behavior

- Inbox alerts are created server-side for monthly budget thresholds (80% and 100%), goal milestones (50%, 75%, 100%), and asset price edits. Budget thresholds and goal milestones are deduplicated.
- The separate montra-market-sync function fetches configured automatic prices. Manual assets still use user-entered values. See ../montra-market-sync/README.md for providers and limitations.
- Web Push is device-specific and requires user opt-in. The service worker does not cache pages or financial data. Push and email bodies contain a generic message; detailed financial information is shown only after opening the signed-in app.
- Signing out removes that device's push subscription.
- Currency changes select a separate ledger; historical amounts are not converted. Existing financial records were migrated as EGP. Each newly saved financial row uses the user's selected base currency.
- Country sets an account/market preference. Each asset may use a different market. Automatic sources convert foreign quotes using daily FX; manual assets require a price in the selected ledger currency.
