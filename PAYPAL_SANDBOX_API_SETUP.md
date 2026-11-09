# PayPal Sandbox Transaction Search (Phase 7)

This integration calls **PayPal's real Sandbox API**, but uses test accounts and test transactions. It does not access personal PayPal history, real bank accounts, or real money. The credentials belong to the configured **sandbox merchant**, not arbitrary Montra users.

## Prerequisites
1. Back up your database and use a **staging** Supabase project.
2. Apply `supabase/migrations/20261109_paypal_sandbox_transaction_sync.sql` in the SQL editor.
3. In PayPal Developer Dashboard create a Sandbox REST app with an eligible Sandbox Business merchant. Obtain its Client ID and Secret. Check whether **Transaction Search / reporting** is enabled for that sandbox merchant; access is not universal.
4. Set **server-side secrets** with Supabase CLI or Dashboard: `PAYPAL_SANDBOX_CLIENT_ID`, `PAYPAL_SANDBOX_CLIENT_SECRET`. Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` for hosted Edge Functions. Never put secrets in HTML, git, browser storage, or chat.
5. Deploy: `supabase functions deploy montra-paypal-transaction-sync` (JWT verification enabled by default). Do not disable JWT verification.
6. Serve the frontend normally, sign in to Montra, open **Accounts** > **PayPal Sandbox API Sync** > **Sync PayPal Sandbox**.
7. If there are no transactions, create a *test* merchant payment in PayPal Sandbox and retry after reporting data becomes available. Transaction Search may have delays.

## Security and limitations
- Edge Function authenticates the caller with Supabase Auth and keeps PayPal credentials on the server.
- All signed-in Montra users currently see **their own copy of the same configured sandbox merchant's transactions** if they invoke sync. Therefore **restrict this staging deployment to authorized testers**. This is not suitable for a public multi-tenant product. A production integration needs account-owner authorization and per-tenant credential/consent mapping.
- Only service-role server writes the separate PayPal Sandbox table. User-facing RLS is read-only and scoped by user ID.
- Does not post transactions into actual expense or budget ledgers; no money is transferred.
- Only the last seven days, first page (up to 100 records), and USD/EGP are imported. Other currencies and invalid rows are skipped and counted. Provider statuses are stored, not equated with paid/settled.
- Requires PayPal Transaction Search eligibility. HTTP 403/401 is shown as a permission/configuration failure, not as a successful sync.
- Disconnect and automatic scheduled sync are not implemented.

## Manual verification
- Try without secrets (configuration error), with expired session (401), with missing Transaction Search permissions (provider error), with no sandbox payments (zero rows), and with a test payment (one row).
- Click sync twice and confirm the same PayPal transaction ID creates only one row per user.
- Verify another authenticated user cannot SELECT the first user's rows.
- Confirm the real expense ledger and budgets remain unchanged.

Reference: https://developer.paypal.com/api/rest/authentication/
