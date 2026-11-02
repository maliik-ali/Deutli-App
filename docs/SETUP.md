# Setup guide (Supabase + Vercel)

Do these once. Takes about 15 minutes.

## A. Supabase — create the database tables

1. Open your project at supabase.com → left menu **SQL Editor** → **New query**.
2. Open `supabase/migrations/20261102000001_academies_and_profiles.sql` in GitHub,
   copy everything, paste it into the editor, click **Run**.
   You should see "Success. No rows returned".
3. New query again → paste `20261102000002_rls_policies.sql` → **Run**.
4. New query again → paste `20261102000003_handle_new_user.sql` → **Run**.

Run them in this order, each only once. (If you run one twice you'll get
"already exists" — that's harmless, it means it's already done.)

Check: left menu **Table Editor** shows `academies` and `profiles`, both with
a green "RLS enabled" label.

## B. Supabase — login settings

1. **Authentication → URL Configuration**
   - Site URL: your Vercel address, e.g. `https://g2d-app.vercel.app`
   - Redirect URLs → Add: `https://g2d-app.vercel.app/**` and `http://localhost:3000/**`
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
   - `SITE_URL` = your Vercel address (no slash at the end)
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

## E. Run on your computer (optional)

```bash
cp .env.example .env.local   # then fill in the 3 values
npm install
npm run dev                  # open http://localhost:3000
```
