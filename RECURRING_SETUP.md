# Recurring bills & subscriptions (Phase 2)

## Setup
1. Back up the Supabase database.
2. Apply `supabase/migrations/20261109_recurring_transactions.sql` in the **same Supabase project** used by the app (after existing migrations). Review the SQL before running it.
3. Deploy `index.html` and `recurring.js` alongside the existing files. Keep the site root paths unchanged.
4. Sign in and open **Accounts** → **Recurring bills & subscriptions**. Create a monthly rule.
5. Once the payment's due date arrives, choose **Record payment**. The app creates an expense only after explicit confirmation. It never transfers money.

## Behavior and limitations
- Recurring rules are independent of the existing *Monthly commitments*. Do not create both for the same bill if you use both in financial estimates; doing so can double-count planned commitments. Existing commitments remain unchanged.
- Each rule posts at most once per calendar month. A shorter month clamps due day 29–31 to its last day.
- Deleting a rule does not delete historical expenses; editing a rule affects future postings, not previously posted expenses.
- Posting is user-triggered, not a background scheduler. If the user misses a month, it does not automatically backfill it.
- PayPal is a **manual payment-method label**, not a live integration.
- Supabase RLS protects rules and expenses. A database unique index prevents duplicate postings under concurrent requests.
- For deployment, test sign-in, different currencies, month boundaries, permissions, and the existing Accounts totals using a staging Supabase project first.

## Test notes
`node --check recurring.js` passes. Existing project test suite still has failing `investments.test.cjs` and `opportunities.test.mjs` (pre-existing failures); all other four test files pass locally. No live Supabase integration or browser end-to-end test was run.
