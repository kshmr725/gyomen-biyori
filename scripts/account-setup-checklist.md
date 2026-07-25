# Account setup — one-time owner actions

These actions require the account owner and cannot be completed with repository code alone.

## 1. GitHub

1. Create a private repository named `gyomen-biyori` under `kshmr725`.
2. From this project directory run:

```bash
git remote add origin git@github.com:kshmr725/gyomen-biyori.git
git push -u origin main
```

## 2. Supabase

1. Create a free Supabase project.
2. Run `supabase/migrations/001_initial.sql` in SQL Editor.
3. Copy Project URL, publishable key and service-role key into Vercel environment variables.

## 3. Google OAuth

1. In Google Cloud Console create an OAuth 2.0 Web Client.
2. Add the Supabase callback URL shown under Authentication > Providers > Google.
3. Add the production Vercel URL to Supabase Site URL and Redirect URLs.
4. Paste the client ID and secret into the Supabase Google provider settings.

## 4. Vercel environment variables

Set the values documented in `.env.example`, then redeploy.
