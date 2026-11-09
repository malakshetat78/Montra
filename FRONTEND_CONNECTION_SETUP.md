# Montra frontend connection checks

1. Run `python -m http.server 5500` from the folder containing `index.html`.
2. Open `http://localhost:5500`, sign in, and open **Accounts**.
3. In **Connection & setup health**, click **Check connection**.
4. A **Ready** result means the signed-in account can query that table. **Needs setup** indicates a missing table; **Check access** indicates a permissions/network error. This is a read-only diagnostic; it does not execute migrations.
5. **Demo connected accounts** and **Demo transaction history** are mock data only. **PayPal Sandbox history** is test-provider data, not live PayPal or bank transactions.

Security: Do not paste service_role keys, PayPal secrets, or database passwords into the browser. The existing frontend includes a Supabase project URL and publishable key. Verify that this is the intended Montra project before using real personal data. Do not point Montra at the ICVSP database. Test RLS and Edge Function authorization separately before public deployment.
