# Publish Montra (Cloudflare Pages)

Montra is a static HTML/CSS/JavaScript website backed by Supabase.

## Publish
1. Open Cloudflare Dashboard -> Workers & Pages -> Create -> Pages -> Connect to Git.
2. Select the GitHub repository `malakshetat78/Montra` and branch `main`.
3. Framework preset: **None**. Build command: **leave blank**. Output directory: **/** (repository root).
4. Deploy. Cloudflare provides a `*.pages.dev` URL.

## Supabase configuration
- In Supabase Auth -> URL Configuration, set Site URL to the published URL, and add the relevant authentication redirect URLs.
- Keep the Supabase **publishable** or legacy `anon` key in frontend code; never put a service-role or secret key in browser files.
- Ensure per-user RLS policies exist and are reviewed before admitting real users.
- Edge Functions are deployed separately through Supabase. GitHub/Cloudflare hosting the static frontend does **not** deploy functions or migrations.
- PayPal Sandbox is test-only and must not be described as a live payment or bank integration.

## Prelaunch checks
- Run the repository's GitHub Actions checks.
- Test signup, login, logout, email confirmation, expenses, budgets and account isolation in a private/incognito window.
- Verify client-side console and network errors, and avoid exposing any backend secrets.
- Do not re-run old migrations against an existing production database without checking migration history and backups.

This file only prepares hosting instructions. It does **not** confirm that a live Cloudflare site has been deployed.
