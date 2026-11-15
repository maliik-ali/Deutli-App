import { Logo } from "@/components/logo";
import { TeacherMobileNav, TeacherSidebar } from "@/components/teacher/teacher-nav";
import { getAvatarUrl } from "@/lib/account/avatar";
import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  // Server-side check on every request: teachers (and admins, who may look in).
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const isAdmin = user.role !== "teacher";
  const avatarUrl = await getAvatarUrl(user.avatarPath);

  // Count of writing waiting for this teacher (shown on the menu).
  let todo = 0;
  const admin = createAdminClient();
  if (admin) {
    const q = admin.from("writing_reviews").select("id", { count: "exact", head: true }).eq("status", "requested");
    const { count } = await (isAdmin ? q.not("teacher_id", "is", null) : q.eq("teacher_id", user.id));
    todo = count ?? 0;
  }
  const props = { todo, isAdmin, name: user.fullName ?? "Teacher", email: user.email, avatarUrl };

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-card md:block">
        <TeacherSidebar {...props} />
      </aside>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-2 backdrop-blur md:hidden">
        <TeacherMobileNav {...props} />
        <Logo href="/teacher" />
        <span className="size-11" aria-hidden />
      </header>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
