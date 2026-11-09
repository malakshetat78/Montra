# Bank & PayPal Sync — MOCK ONLY

This phase is a simulator, **not** a bank or PayPal connection. All transaction descriptions, IDs, amounts, and dates are fictional. It never collects bank passwords, payment card details, OAuth tokens, or PayPal credentials. It never moves money.

## Setup
1. Back up your Supabase project and test on a staging project first.
2. Run `supabase/migrations/20261109_mock_connected_accounts.sql` in the Supabase SQL editor.
3. Serve the updated Montra frontend using the same setup as the existing app; log in with a test user.
4. Navigate to **Accounts** and select **Connect demo Egyptian bank** or **Connect demo PayPal**.
5. Click **Run demo sync**. Click it again: duplicate protection should prevent additional entries.
6. Switch currency from **Settings** to EGP (bank demo) or USD (PayPal demo) to view corresponding records.
7. Disconnect to remove demo account and its demo transactions (cascade delete).

## Deliberate limitations
- Demo transactions remain isolated in `montra_synced_transactions` and do **not** modify `montra_expenses`, income, budgets, forecasts, or recurring-payment states.
- No automatic schedule or live webhook is configured.
- The demo is run by an authenticated user clicking the sync button, not by a server job.
- The `external_id` uniqueness constraint enforces per-account deduplication. The mock rows are fixed so repeated syncs are idempotent.
- The mock database allows the authenticated user to insert demo records for their own account. This is suitable for a simulator, **not** for a production financial ingestion pipeline. A production provider integration must verify signed webhooks or pull transactions server-side, use provider-scoped credentials, enforce provenance and authorization, and prevent client-written `provider_verified` records.
- Real Egyptian-bank transaction feeds depend on the bank or an approved aggregator and consent. Personal PayPal activity API access differs from merchant/business transaction APIs. Neither is claimed to be available here.

## Test
Run `node --test tests/bank-sync.test.js`. Browser and Supabase integration must still be tested manually on staging.
