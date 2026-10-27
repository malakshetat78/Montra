# Montra

A personal finance web application for tracking cash and manually entered PayPal expenses, monthly category budgets, savings goals, income sources, and recurring commitments.

## Run locally

This is a static HTML/CSS/JavaScript application. Serve the repository root using a local web server:

```sh
python -m http.server 8000
```

Open http://localhost:8000. Authentication and data use Supabase. The existing code contains the project's Supabase URL and publishable key; these are designed for browser use, not secret keys. Access control depends on Supabase Auth and the row-level security policies in `supabase/schema.sql`.

## Database setup

The existing deployed app uses an existing Supabase project. To set up a new project, run `supabase/schema.sql` **only on a new empty project**, replace the Supabase URL and publishable key in `index.html`, and configure the site and redirect URLs in Supabase Authentication. This schema is a reconstruction of the tables needed by this source, not the original migration history.

For signup and password recovery, configure appropriate redirect URLs and an email service. The default Supabase email service has restrictions and is intended for testing.

## Current functionality and limitations

- Email/password authentication, manually entered cash and PayPal expenses, categories, budgets, goals, monthly income, and commitment reminders.
- PayPal is **not connected**; PayPal expenses are manually entered.
- Commitment reminders are shown inside the app and do not automatically create transactions.
- Assets, automatic price feeds, and production-ready email delivery are not implemented.
- This repository does not contain customer data or a service-role key. Never commit service-role keys, SMTP passwords, API secrets, or personal credentials.
