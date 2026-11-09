# Debt & Loan Tracker — Phase 4

1. In Supabase SQL Editor, run `supabase/migrations/20261109_debt_tracker.sql` after the existing migrations. Use a staging project first and back up production data.
2. Serve the project from its root (script URLs start with `/`), sign in, open **Accounts**, and scroll to **Debts & loans**.
3. Add a debt, record a partial repayment, reload, and verify the remaining amount. Try recording more than the remaining amount; the database trigger must reject it.
4. Confirm a second authenticated user cannot read or modify the first user's debt records (RLS).

Notes: This is a manual ledger, not a payment gateway. Repayments do not automatically create transactions or alter the cash-flow forecast, avoiding double counting until a deliberate integration is designed. Deleting a debt deletes its repayment history. Records are separated by base currency. This release has no interest calculation, amortization, editing, or payment reminders. SQL migration and authenticated browser integration have **not** been executed against a live Supabase project.

Tests: `node --test tests/debt-math.test.cjs`.
