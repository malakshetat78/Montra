# PayPal Sandbox + simulated stock purchase

This function is sandbox-only. The PayPal base URL is fixed to api-m.sandbox.paypal.com; no live credentials/environment switch exists. It validates every bearer token using Supabase Auth. Deploy with platform verify_jwt=false because internal user-token validation is mandatory.

Configure these Vault secret names through a secure admin interface (never in source):
- montra_paypal_sandbox_client_id
- montra_paypal_sandbox_client_secret
- montra_twelvedata_key (already used by the market-price worker)

PayPal Sandbox app credentials are currently not configured. Payment buttons remain unavailable until they are supplied. Price review remains usable if Twelve Data and currency reference data are available. No fake PayPal success path exists.

Flow: authenticated price review -> immutable database draft -> server-created USD PayPal order -> user approval on www.sandbox.paypal.com -> explicit server capture verification -> simulated fill. Server checks order owner, order/custom IDs, completed capture, exact USD amount and single capture. Stable idempotency keys cover create/capture. A row-locking service-only RPC completes each draft once. Retry after a timeout recovers an already completed PayPal order. Cancellations are never treated as payment success. Uncompleted reviews do not create holdings. Drafts expire for new payment creation after 15 minutes. Reviews are rate-limited to 20/hour/user.

US symbols only in this demo. Shares and zero fees are simulated at the stored review price, not real broker execution. Records are separate from montra_assets, expenses and goal savings, so neither Sandbox funds nor simulated fills inflate real totals. Currency equivalents use daily reference FX. They are not PayPal conversion quotes. Use Sandbox buyer accounts only; never enter real funding details.

Not implemented: live trading, Egyptian stock purchases, broker settlement, refunds, webhook reconciliation or production payment acceptance. Capture confirmation is recovered through authenticated order verification after returning to Montra. Real investing requires an eligible broker/payment arrangement.

## Discovery before checkout
The authenticated explore action returns fixed research examples (VTI, AAPL, MSFT), with real provider quotes cached 15 minutes. It is not a ranking, valuation model, suitability determination or forecast. Missing/old quotes are clearly unavailable and cannot be compared. The UI defaults to Egypt, explicitly awaiting a provider; US examples are available by selecting that market. Goal comparisons apply hypothetical -20/0/+20 percent gain or loss to the remaining savings gap, with stated assumptions and downside disclosure. They do not change real goal savings.
