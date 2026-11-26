import type { Metadata } from "next";
import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { RequestActions } from "@/components/directory/request-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { listJoinRequests } from "@/lib/directory/queue";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Join requests" };

const FILTERS = [
  { id: "open", label: "To handle" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
] as const;
const STATUS: Record<string, string> = { new: "New", payment_sent: "Payment link sent", assigned: "Assigned", declined: "Declined" };

export default async function JoinRequestsPage(props: PageProps<"/admin/join-requests">) {
  await requireUser(["academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const filter = FILTERS.find((f) => f.id === sp.show)?.id ?? "open";
  const admin = createAdminClient();
  const items = admin ? await listJoinRequests(admin, filter) : [];

  return (
    <AdminShell title="Join requests" description="Students without a teacher who asked to join a listed teacher. Send the payment link, assign the teacher once paid, and pay the teacher yourself." back={{ href: "/admin", label: "Admin" }}>
      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={`/admin/join-requests?show=${f.id}`}
            aria-current={f.id === filter ? "page" : undefined}
            className={f.id === filter ? "inline-flex h-11 items-center rounded-full border border-gold-ink bg-gold-soft px-5 text-sm font-semibold" : "inline-flex h-11 items-center rounded-full border border-border bg-card px-5 text-sm font-semibold text-muted-foreground hover:bg-muted"}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <Card>
          <p className="text-[15px] text-muted-foreground">No requests here.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((r) => (
            <Card key={r.id} className="gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <p className="text-[17px] font-bold">{r.student.name} <span className="font-normal text-muted-foreground">wants to join</span> {r.teacher.name}</p>
                  <p className="text-[13px] text-muted-foreground">{r.academy ?? "No academy"} · {new Date(r.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  <p className="text-[14px]">
                    {r.student.email ? <a className="underline underline-offset-4" href={`mailto:${r.student.email}`}>{r.student.email}</a> : "No email"}
                    {r.student.phone ? ` · ${r.student.phone}` : ""}
                  </p>
                </div>
                <Badge variant={r.status === "assigned" ? "success" : r.status === "declined" ? "outline" : "gold"}>{STATUS[r.status]}</Badge>
              </div>
              {r.message && <p className="rounded-xl bg-muted/60 px-4 py-3 text-[14px] whitespace-pre-line">{r.message}</p>}
              <RequestActions id={r.id} status={r.status} note={r.adminNote} teacherName={r.teacher.name} />
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
