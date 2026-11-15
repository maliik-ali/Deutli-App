# Setup guide (Supabase + Vercel)

The app lives at **https://app.deutli.com**. (`deutli.com` / `www.deutli.com` is the marketing website (separate repo: maliik-ali/Deutli-Website).)

Do these once. Takes about 15 minutes.

## A. Supabase — create the database tables

1. Open your project at supabase.com → left menu **SQL Editor** → **New query**.
2. Open `supabase/migrations/20261102000001_academies_and_profiles.sql` in GitHub,
   copy everything, paste it into the editor, click **Run**.
   You should see "Success. No rows returned".
3. New query again → paste `20261102000002_rls_policies.sql` → **Run**.
4. New query again → paste `20261102000003_handle_new_user.sql` → **Run**.

5. For **Daily Practice** (texts + audio): New query → paste `20261112000001_daily_practice.sql` → **Run**.
   Then the same with `20261112000002_daily_practice_sample.sql` (adds one sample set, optional).
   Check: **Table Editor** shows `practice_sets`, `practice_tracks`, `practice_log`, and
   **Storage** shows a private bucket `practice-audio`.

6. For **saved words** (select a word in a Daily Practice text to save it): New query → paste
   `20261112000003_vocabulary_words.sql` → **Run**. Check: **Table Editor** shows `vocabulary_words`.

Run them in this order, each only once. (If you run one twice you'll get
"already exists" — that's harmless, it means it's already done.)

Check: left menu **Table Editor** shows `academies` and `profiles`, both with
a green "RLS enabled" label.

## B. Supabase — login settings

1. **Authentication → URL Configuration**
   - Site URL: `https://app.deutli.com`
   - Redirect URLs → Add: `https://app.deutli.com/**` and `http://localhost:3000/**`
2. **Authentication → Email Templates** (recommended — makes email links work on any device)
   - "Confirm signup": replace the link with
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard`
   - "Reset password": replace the link with
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
3. For the pilot (100+ students): Supabase's built-in email only sends a few
   emails per hour. Before inviting students, add your own email sender under
   **Authentication → Emails → SMTP Settings** (e.g. Resend, Brevo).

## C. Vercel — connect the keys

1. In Supabase: **Project Settings → API Keys** → copy the **Publishable key**
   (starts with `sb_publishable_`). Copy the **Project URL** too
   (Project Settings → Data API, looks like `https://xxxx.supabase.co`).
2. In Vercel: your project → **Settings → Environment Variables** → add:
   - `SUPABASE_URL` = the Project URL
   - `SUPABASE_PUBLISHABLE_KEY` = the publishable key
   - `SITE_URL` = `https://app.deutli.com` (no slash at the end)
3. **Deployments** → latest → **⋯ → Redeploy**.

Never paste the **secret** key (`sb_secret_…` / service_role) into Vercel with a
`NEXT_PUBLIC_` name, and never into the code.

## D. Make someone a teacher or admin

Everyone who signs up is a student. To change a role, run in the SQL Editor:

```sql
-- create an academy (once)
insert into public.academies (name) values ('Your Academy Name');

-- make a teacher / admin (change the email and role)
update public.profiles
set role = 'teacher',            -- or 'academy_admin' or 'super_admin'
    academy_id = (select id from public.academies where name = 'Your Academy Name')
where id = (select id from auth.users where email = 'person@example.com');
```

The person logs out and in again to land on their new page.

Admins add Daily Practice texts and audio at `/admin/daily-practice`. They can also
practise themselves: the "See the student page" button opens `/dashboard/daily-practice`.

## E. Run on your computer (optional)

```bash
cp .env.example .env.local   # then fill in the 3 values
npm install
npm run dev                  # open http://localhost:3000
```

## Branded emails (signup confirmation, password reset)

The HTML for these emails lives in `supabase/templates/`. Supabase sends them; you paste them in once.

1. **Send from your own domain** (so mail isn't marked as spam, and to lift Supabase's low test limit):
   create an account at an email service (e.g. Resend), add the domain `deutli.com`, and add the DNS
   records it shows (SPF, DKIM, DMARC). Then in Supabase → Authentication → Emails → SMTP Settings,
   turn on custom SMTP with the service's host, port, user and password.
   Sender name: `Deutli`, sender email: `hello@deutli.com`.
2. **Templates:** Supabase → Authentication → Emails → Templates.
   - Confirm signup: subject `Confirm your Deutli account`, body = `supabase/templates/confirm-signup.html`
   - Reset password: subject `Reset your Deutli password`, body = `supabase/templates/reset-password.html`
3. The links use `{{ .SiteURL }}/auth/confirm?token_hash=…`, which works on any device
   (Supabase's default link only works in the browser where the student signed up).
   Site URL must be `https://app.deutli.com`.

## F. Sign in with Google

The "Continue with Google" button is already in the app (login and signup pages). It works after you switch Google on. Until then the button shows a friendly "isn't available yet" message.

Redirect URL to paste into Google (this is Supabase's, not ours): `https://epawkdeosmuvczpsyoru.supabase.co/auth/v1/callback`

1. Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.
2. Authorized redirect URI: the Supabase URL above. (Set up the OAuth consent screen first if asked.)
3. Copy the Client ID and Client secret.
4. Supabase → Authentication → Sign In / Providers → Google → switch on, paste both, save.
5. Supabase → Authentication → URL Configuration: Site URL `https://app.deutli.com` and add `https://app.deutli.com/**` under Redirect URLs.

New students who sign up this way go through onboarding like everyone else. Their role is always "student".

## G. Card payments with Stripe

1. Stripe Dashboard → Developers → API keys → copy the **Secret key** (starts with `sk_`). Use the test key (`sk_test_`) first.
2. Stripe Dashboard → Developers → Webhooks → Add endpoint. URL: `https://app.deutli.com/api/stripe/webhook`. Event: `checkout.session.completed` (also add `checkout.session.async_payment_succeeded`). Copy the **Signing secret** (starts with `whsec_`).
3. Vercel → Project → Settings → Environment Variables: add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Optional: `STRIPE_CURRENCY` (default `pkr`; your Stripe account must accept it, otherwise use `usd` and set plan prices in dollars). Redeploy.
4. Test: make a plan in Admin → Payments, buy it with Stripe's test card `4242 4242 4242 4242`, any future date, any CVC. Pro should switch on by itself within seconds.
5. When it works, replace the test keys with live keys (`sk_live_`) and a live webhook.

Easypaisa, JazzCash and bank transfer need nothing here: add your accounts in Admin → Payments.
