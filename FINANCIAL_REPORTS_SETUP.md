# Montra financial reports (Phase 3)

Added `finance-reports.js` (pure calculation helpers), `finance-reports-ui.js` (overview panel), and tests. No SQL migration required. Open the Overview page after signing in. Select a month to see category totals and export CSV. The 30/60/90-day cash-flow figures are estimated *changes*, not balances.

## Important assumptions
- Monthly income uses the profile value, falling back to the sum of income sources; these are not added together.
- Variable spending uses recorded expenses from up to the previous three calendar months, excluding entries linked to recurring rules and commitments when tagged.
- Monthly commitments are subtracted separately; if a commitment is also recorded as an ordinary expense without a link, it may be counted twice. Check before relying on estimates.
- No bank balance or actual payment confirmation is inferred.
- All calculations run in the authenticated browser from the existing currency-filtered state; no new financial data is sent to third parties.
- Requires serving the project at its root URL because script paths are absolute.

## Test
`node --test tests/finance-reports.test.cjs`
