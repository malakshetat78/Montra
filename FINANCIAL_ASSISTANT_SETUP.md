# Financial Assistant — private beta

Open the Overview page after signing in. The assistant answers five categories of questions using the records already loaded into the authenticated browser session. No SQL migration, paid AI API, LLM key, or external AI service is needed.

This is a **deterministic rules-based assistant**, not a generative AI chatbot. It intentionally does not claim to understand arbitrary language, use bank data, or provide investment advice. Answers cover current-month expenses, highest spending category, previous-month comparison, profile base income, and first savings goal. All results are labeled as recorded data and incomplete months are called out.

Run `node --test tests/financial-assistant.test.cjs` to test the calculation layer. To test the UI, serve the project through HTTP, sign in to a test Supabase account, open Overview, and try the four quick questions. Test with no expenses and missing prior-month data. The browser integration and live Supabase connection have not been automatically verified.

Future generative AI should use a server-side authenticated endpoint, narrow read-only queries, data minimization, prompt-injection protections, cost limits and explicit user consent before sending personal financial data to a model provider.
