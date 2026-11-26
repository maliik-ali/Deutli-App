#!/usr/bin/env node
/**
 * Seeds the LOCAL test copy of Supabase (supabase start) with four test accounts and a little demo data,
 * so every role can be tested without touching the live site. Safe to run again.
 *
 *   npx supabase start        # once, needs Docker (Colima or Docker Desktop)
 *   node scripts/seed-test.mjs
 *
 * These accounts exist only on the local copy. The password is local-only test data.
 * Never point this script at the live project: it refuses to run unless the URL is local.
 */
const URL_ = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SERVICE_ROLE_KEY;
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(URL_)) {
  console.error("Refusing to seed: SUPABASE_URL is not a local address.");
  process.exit(1);
}
if (!KEY) {
  console.error("Set SUPABASE_SECRET_KEY (the service role key printed by `supabase start`).");
  process.exit(1);
}

export const PASSWORD = "Test@321";
const ACCOUNTS = [
  { key: "admin", email: "admin@test.local", name: "Test Admin", role: "super_admin" },
  { key: "teacher", email: "teacher@test.local", name: "Test Teacher", role: "teacher" },
  { key: "studentWith", email: "student-with-teacher@test.local", name: "Test Student With Teacher", role: "student" },
  { key: "studentSolo", email: "student-without-teacher@test.local", name: "Test Student Solo", role: "student" },
];

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
async function call(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${URL_}${path}`, { method, headers: { ...headers, ...(prefer ? { Prefer: prefer } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}
const rest = (path, opts) => call(`/rest/v1/${path}`, opts);

async function ensureUser(a) {
  const list = await call(`/auth/v1/admin/users?per_page=200`);
  const found = (list.users ?? []).find((u) => u.email === a.email);
  if (found) {
    await call(`/auth/v1/admin/users/${found.id}`, { method: "PUT", body: { password: PASSWORD, email_confirm: true } });
    return found.id;
  }
  const u = await call(`/auth/v1/admin/users`, { method: "POST", body: { email: a.email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: a.name } } });
  return u.id;
}

const ids = {};
for (const a of ACCOUNTS) ids[a.key] = await ensureUser(a);

// Roles, names, onboarding done (so nobody is sent to the signup questions).
for (const a of ACCOUNTS) {
  await rest(`profiles?id=eq.${ids[a.key]}`, { method: "PATCH", body: { role: a.role, full_name: a.name, onboarded_at: new Date().toISOString() } });
}

// The teacher's academy, listed in Find a teacher, with a public teacher profile.
const [plan] = await rest("plans?code=eq.teacher_free&select=id");
let [academy] = await rest(`academies?slug=eq.test-german-academy&select=id`);
if (!academy) {
  [academy] = await rest("academies", {
    method: "POST",
    prefer: "return=representation",
    body: {
      name: "Test German Academy",
      kind: "school",
      slug: "test-german-academy",
      owner_id: ids.teacher,
      plan_id: plan?.id ?? null,
      tagline: "German exam preparation, A1 to B2",
      about: "Small online batches, weekly speaking practice and mock exams for Goethe and Telc.",
      country: "Lahore, Pakistan",
      languages: ["en", "ur"],
      is_listed: true,
      listed_at: new Date().toISOString(),
    },
  });
  await rest("academy_members", { method: "POST", body: { academy_id: academy.id, user_id: ids.teacher, role: "owner" } });
}
await rest(`profiles?id=eq.${ids.teacher}`, { method: "PATCH", body: { academy_id: academy.id } });
await rest("teacher_profiles", {
  method: "POST",
  prefer: "resolution=merge-duplicates",
  body: { user_id: ids.teacher, headline: "Telc B1 teacher, 8 years of exam preparation", bio: "I help students feel confident before the exam.", specialties: ["speaking", "grammar"], speaks: ["en", "ur"], is_public: true, qualifications: ["Telc B1 certified examiner"] },
});

// A batch with the student who has a teacher, in it for 20 days (so they count as a verified reviewer).
await rest(`profiles?id=eq.${ids.studentWith}`, { method: "PATCH", body: { teacher_id: ids.teacher, academy_id: academy.id } });
let [batch] = await rest(`batches?teacher_id=eq.${ids.teacher}&name=eq.Demo%20batch&select=id`);
if (!batch) [batch] = await rest("batches", { method: "POST", prefer: "return=representation", body: { academy_id: academy.id, teacher_id: ids.teacher, name: "Demo batch", level: "B1", exam: "Goethe B1" } });
await rest("batch_members", { method: "POST", prefer: "resolution=merge-duplicates", body: { batch_id: batch.id, student_id: ids.studentWith, academy_id: academy.id, created_at: new Date(Date.now() - 20 * 86_400_000).toISOString() } });

console.log("Seeded the local test copy.");
console.log(`Password for all accounts: ${PASSWORD}`);
for (const a of ACCOUNTS) console.log(`  ${a.role.padEnd(12)} ${a.email}`);
console.log("Teacher id:", ids.teacher, " Academy slug: test-german-academy");
