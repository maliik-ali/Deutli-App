import { AdminMobileNav, AdminSidebar } from "@/components/admin/admin-nav";
import { TimeZoneSync } from "@/components/account/time-zone-sync";
import { Logo } from "@/components/logo";
import { getAvatarUrl } from "@/lib/account/avatar";
import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Server-side check on every request: only admins get past here.
  const user = await requireUser(["academy_admin", "super_admin"]);
  const avatarUrl = await getAvatarUrl(user.avatarPath);
  // Count of new support messages, shown on the menu.
  const { count } = (await createAdminClient()?.from("feedback").select("id", { count: "exact", head: true }).eq("status", "new")) ?? { count: 0 };
  const props = { newFeedback: count ?? 0, name: user.fullName ?? "Admin", email: user.email, avatarUrl };

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[264px_minmax(0,1fr)]">
      {!user.timeZoneSaved && <TimeZoneSync />}
      <aside className="hidden border-r border-border bg-card md:block">
        <AdminSidebar {...props} />
      </aside>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-2 backdrop-blur md:hidden">
        <AdminMobileNav {...props} />
        <Logo href="/admin" />
        <span className="size-11 shrink-0" aria-hidden />
      </header>
      <div className="min-w-0 overflow-x-clip">{children}</div>
    </div>
  );
}
