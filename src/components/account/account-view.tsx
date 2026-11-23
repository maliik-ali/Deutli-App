import { AccountSettings } from "@/components/account/account-settings";
import { getAvatarUrl } from "@/lib/account/avatar";
import { hasPro, type CurrentUser } from "@/lib/auth/dal";
import { getMyOrders } from "@/lib/pro/data";
import { longDay, proReminder } from "@/lib/pro/reminder";
import { todayIn } from "@/lib/time";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** The Account screen (photo, name, contact, password, time zone). Shared by the student, teacher and admin areas; the caller checks the role. */
export async function AccountView({ user }: { user: CurrentUser }) {
  const supabase = await createClient();
  const [{ data: profile }, avatarUrl, { data: auth }, orders] = await Promise.all([
    supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle(),
    getAvatarUrl(user.avatarPath),
    supabase.auth.getUser(),
    user.role === "student" ? getMyOrders(5) : Promise.resolve([]),
  ]);
  // The workspace the student joined (read on the server; students have no direct access to the academies table for other people's data).
  let workspaceName: string | null = null;
  if (user.role === "student") {
    const { data: own } = await supabase.from("profiles").select("academy_id").eq("id", user.id).maybeSingle();
    if (own?.academy_id) {
      const { data: ac } = await createAdminClient()?.from("academies").select("name").eq("id", own.academy_id).maybeSingle() ?? { data: null };
      workspaceName = ac?.name ?? null;
    }
  }
  const pro = user.role === "student" && hasPro(user);
  const today = todayIn(user.timeZone);
  const daysLeft = pro && user.proUntil ? Math.round((Date.parse(user.proUntil) - Date.parse(today)) / 86_400_000) : null;
  const nudge = user.role === "student" ? proReminder(user.proUntil, today) : null;
  // A payment still open from the last week (older unpaid ones are just abandoned).
  const weekAgo = Date.parse(today) - 7 * 86_400_000;
  const open = orders.find((o) => (o.status === "pending" || o.status === "awaiting_review") && Date.parse(o.created_at) > weekAgo);
  const identities = auth.user?.identities ?? [];
  const providers = new Set(identities.map((i) => i.provider));
  const googleData = identities.find((i) => i.provider === "google")?.identity_data ?? null;
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const google = googleData
    ? {
        name: text(googleData.full_name) ?? text(googleData.name),
        email: text(googleData.email),
        avatarUrl: text(googleData.avatar_url) ?? text(googleData.picture),
      }
    : null;

  return (
    <>
      <header className="grid gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Account</h1>
        <p className="text-[15px] text-muted-foreground">
          {user.role === "student" ? "Your photo, name, plan, contact details, password, languages and time zone." : "Your photo, name, contact details, password and time zone."}
        </p>
      </header>
      <div className="max-w-[960px]">
        <AccountSettings
          info={{
            fullName: user.fullName ?? "",
            email: auth.user?.email ?? user.email ?? "",
            pendingEmail: auth.user?.new_email ?? null,
            phone: profile?.phone ?? "",
            languages: user.languages,
            avatarUrl,
            timeZone: user.timeZone,
            // Older accounts may have no identities list; they signed up with email and password.
            signIn: { google, password: providers.has("email") || providers.size === 0 },
            plan: {
              kind: user.role !== "student" ? "staff" : pro ? "pro" : "free",
              until: pro && user.proUntil ? longDay(user.proUntil) : null,
              daysLeft,
              reminder: nudge && user.proUntil ? { ...nudge, until: longDay(user.proUntil) } : null,
              openOrder: open ? { id: open.id, reference: open.reference, status: open.status as "pending" | "awaiting_review" } : null,
            },
            join: user.role === "student" ? { workspaceName } : null,
            canDelete: user.role === "student",
          }}
        />
      </div>
    </>
  );
}
