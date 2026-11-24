import type { Metadata } from "next";

import { CreateWorkspaceForm, WorkspaceRow, type PlanOption, type WorkspaceItem } from "@/components/academies/academies-admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { countWorkspaceStudents, formatMinor, getWorkspacePlans, WORKSPACE_COLUMNS, type Workspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { signupSummary, type SignupRow } from "@/lib/teachers/signup-summary";

export const metadata: Metadata = { title: "Workspaces" };

export default async function AdminAcademiesPage() {
  await requireUser(["academy_admin", "super_admin"]);
  const admin = createAdminClient();
  let items: WorkspaceItem[] = [];
  let plans: PlanOption[] = [];

  if (admin) {
    const [planRows, list] = await Promise.all([getWorkspacePlans(), admin.from("academies").select(WORKSPACE_COLUMNS).order("created_at", { ascending: false })]);
    const academies = (list.data ?? []) as Workspace[];
    plans = planRows.map((p) => ({
      id: p.id,
      code: p.code,
      kind: p.kind,
      name: p.name,
      priceLabel: p.code === "institute" ? `from ${formatMinor(p.eur_cents, "EUR")}` : p.eur_cents ? `${formatMinor(p.eur_cents, "EUR")} / month` : "Free",
      removeBranding: p.features.includes("remove_branding"),
    }));
    const [counts, owners, teacherCounts, signups] = await Promise.all([
      countWorkspaceStudents(academies.map((a) => a.id)),
      admin.from("profiles").select("id, full_name").in("id", academies.map((a) => a.owner_id).filter((x): x is string => !!x)),
      admin.from("academy_members").select("academy_id").in("academy_id", academies.map((a) => a.id)),
      admin.from("workspace_signups").select("academy_id, account_type, exams, levels, student_count, tools, wants").in("academy_id", academies.map((a) => a.id)),
    ]);
    const answers = new Map(((signups.data ?? []) as (SignupRow & { academy_id: string })[]).map((r) => [r.academy_id, r]));
    const ownerName = new Map(((owners.data ?? []) as { id: string; full_name: string | null }[]).map((o) => [o.id, o.full_name ?? "Unnamed"]));
    const tCount = new Map<string, number>();
    for (const r of (teacherCounts.data ?? []) as { academy_id: string }[]) tCount.set(r.academy_id, (tCount.get(r.academy_id) ?? 0) + 1);
    const emails = new Map<string, string | null>();
    await Promise.all(
      academies.map(async (a) => {
        if (!a.owner_id) return;
        const { data } = await admin.auth.admin.getUserById(a.owner_id);
        emails.set(a.id, data.user?.email ?? null);
      }),
    );
    items = academies.map((a) => {
      const plan = planRows.find((p) => p.id === a.plan_id);
      return {
        id: a.id,
        name: a.name,
        kind: a.kind,
        ownerName: a.owner_id ? (ownerName.get(a.owner_id) ?? "Unnamed") : "No owner",
        ownerEmail: emails.get(a.id) ?? null,
        planId: a.plan_id,
        students: counts.get(a.id) ?? 0,
        maxStudents: plan?.max_students ?? null,
        teachers: tCount.get(a.id) ?? 0,
        maxTeachers: plan?.max_teachers ?? null,
        discountPercent: a.discount_percent,
        discountUntil: a.discount_until ?? "",
        showPoweredBy: a.show_powered_by,
        signupSummary: answers.has(a.id) ? signupSummary(answers.get(a.id)!) : null,
      };
    });
  }

  return (
    <AdminShell title="Workspaces" description="Each school or teacher is a workspace. Create one, pick the owner and the plan, and set a founding discount." back={{ href: "/admin", label: "Admin" }}>
      <Card>
        <div className="grid gap-1">
          <CardTitle>New workspace</CardTitle>
          <CardDescription>The owner needs a Deutli account already. They become the workspace owner and can use the teacher pages.</CardDescription>
        </div>
        <CreateWorkspaceForm plans={plans} />
      </Card>

      <Card>
        <div className="grid gap-1">
          <CardTitle>All workspaces ({items.length})</CardTitle>
          <CardDescription>Students are counted from who is attached to the workspace or taught by its teachers. &quot;Active student&quot; counting starts once homework and tests exist.</CardDescription>
        </div>
        {items.length === 0 ? <p className="text-[14px] text-muted-foreground">No workspaces yet.</p> : <ul className="divide-y divide-border">{items.map((i) => <WorkspaceRow key={i.id} item={i} plans={plans} />)}</ul>}
      </Card>
    </AdminShell>
  );
}
