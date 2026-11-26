# Testing on a local copy (no live logins needed)

The live site is never used to sign in with test passwords. Instead there is a **local test copy**:
a private Supabase database on this computer (in Docker) plus the app on `http://localhost:3123`.
Four test accounts and a little demo data are created by a script, so every role can be tested alone.

## One-time setup (already done on Malik's Mac, Homebrew + Colima)
```bash
brew install colima docker docker-compose
colima start --cpu 4 --memory 6 --disk 30
```
Docker Desktop works too. The Supabase command line is run with `npx supabase`.

## Start it
```bash
export DOCKER_HOST=unix://$HOME/.colima/default/docker.sock   # only with Colima
colima start                                                  # if it is not running
npx supabase start -x realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
SUPABASE_SECRET_KEY=$(npx supabase status -o env | grep ^SERVICE_ROLE_KEY= | cut -d= -f2- | tr -d '"') node scripts/seed-test.mjs
```
`supabase start` applies every file in `supabase/migrations/` by itself, so **a new migration is tested here first**.
Then `.env.local` (git-ignored) points the app at the local copy:
`SUPABASE_URL=http://127.0.0.1:54321`, the local anon key as `SUPABASE_PUBLISHABLE_KEY`, the local service key as
`SUPABASE_SECRET_KEY`, `SITE_URL=http://localhost:3123`. (`npx supabase status -o env` prints the keys.)
Start the app with `npm run dev -- -p 3123` (or the `deutli-dev` preview).

Reset everything: `npx supabase db reset`, then run the seed script again.
Stop: `npx supabase stop`.

## The test accounts (local copy only, password `Test@321`)
| Role | Email |
|---|---|
| Deutli admin | `admin@test.local` |
| Teacher | `teacher@test.local` (academy "Test German Academy", listed in Find a teacher) |
| Student with a teacher | `student-with-teacher@test.local` (in "Demo batch" for 20 days, so a verified reviewer) |
| Student without a teacher | `student-without-teacher@test.local` |
| Teacher of a second, unlisted school | `other-teacher@test.local` ("Other Private School", one class tomorrow) |

These exist only in the local database. The seed script refuses to run against anything that is not a local address.

## Class visibility (tested this way)
A school student sees only their school's classes; a student on their own sees listed academies' classes and never the unlisted school's. Direct links to hidden classes, teachers and academies give the 404 page; Find a teacher sends school students back to the dashboard.

## What was tested this way
Reviews (write, report, teacher reply, admin hide and restore), Find a teacher (listing, filters), request to join and the
admin queue (payment link sent, assign). After an assignment the student becomes the teacher's student.
