import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Pro requests" };

export default async function ProRequestsPage() {
  await requireUser(["academy_admin", "super_admin"]);
  const admin = createAdminClient();
  const { data } = admin ? await admin.from("pro_requests").select("user_id, note, created_at").order("created_at", { ascending: false }).limit(200) : { data: [] };
  const rows = (data ?? []) as { user_id: string; note: string | null; created_at: string }[];
  const info = new Map<string, { name: string; phone: string | null }>();
  if (admin && rows.length) {
    const { data: ps } = await admin.from("profiles").select("id, full_name, phone").in("id", rows.map((r) => r.user_id));
    for (const p of (ps ?? []) as { id: string; full_name: string | null; phone: string | null }[]) info.set(p.id, { name: p.full_name ?? "Student", phone: p.phone });
  }
  return (
    <AdminShell title="Pro requests" description="Students who asked for Deutli Pro. Contact them with the price and how to pay." back={{ href: "/admin", label: "Admin" }}>
      <Card className="p-2 sm:p-4">
        {rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-muted-foreground">No requests yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.user_id} className="grid gap-0.5 px-3 py-3">
                <span className="font-semibold">
                  {info.get(r.user_id)?.name} <span className="font-normal text-muted-foreground">· {info.get(r.user_id)?.phone ?? "no phone"}</span>
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Karachi" })}
                  {r.note ? ` · ${r.note}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AdminShell>
  );
}
