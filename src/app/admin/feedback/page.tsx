import type { Metadata } from "next";
import Link from "next/link";

import { FeedbackStatus } from "@/components/admin/feedback-status";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { FEEDBACK_KINDS, SUPPORT } from "@/lib/support/contact";

export const metadata: Metadata = { title: "Feedback" };

const KIND_LABEL = Object.fromEntries(FEEDBACK_KINDS.map((k) => [k.id, k.label]));
const FILTERS = [
  { id: "open", label: "To answer" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
] as const;

type Row = { id: string; user_id: string; kind: string; message: string; page: string | null; email: string | null; status: "new" | "in_progress" | "done"; created_at: string };

export default async function FeedbackPage(props: PageProps<"/admin/feedback">) {
  const user = await requireUser(["academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const filter = FILTERS.find((f) => f.id === sp.show)?.id ?? "open";
  const admin = createAdminClient();
  let rows: Row[] = [];
  const people = new Map<string, { name: string; phone: string | null }>();
  if (admin) {
    let q = admin.from("feedback").select("id, user_id, kind, message, page, email, status, created_at").order("created_at", { ascending: false }).limit(200);
    if (filter === "open") q = q.neq("status", "done");
    if (filter === "done") q = q.eq("status", "done");
    rows = ((await q).data ?? []) as Row[];
    const ids = [...new Set(rows.map((r) => r.user_id))];
    if (ids.length) {
      const { data } = await admin.from("profiles").select("id, full_name, phone").in("id", ids);
      for (const x of (data ?? []) as { id: string; full_name: string | null; phone: string | null }[]) people.set(x.id, { name: x.full_name ?? "Student", phone: x.phone });
    }
  }

  return (
    <AdminShell title="Feedback" description={`Messages from students. Reply by WhatsApp or email, then mark them Done. Students also see the status. Support inbox: ${SUPPORT.email}.`} back={{ href: "/admin", label: "Admin" }}>
      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={`/admin/feedback?show=${f.id}`}
            aria-current={f.id === filter ? "page" : undefined}
            className={f.id === filter ? "inline-flex h-11 items-center rounded-full border border-gold-ink bg-gold-soft px-5 text-sm font-semibold" : "inline-flex h-11 items-center rounded-full border border-border bg-card px-5 text-sm font-semibold text-muted-foreground hover:bg-muted"}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <Card>
          <p className="text-[15px] text-muted-foreground">No messages here.</p>
        </Card>
      ) : (
        <ul className="grid gap-4">
          {rows.map((r) => {
            const who = people.get(r.user_id);
            const digits = who?.phone?.replace(/[^\d]/g, "") ?? "";
            return (
              <li key={r.id}>
                <Card className="gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge variant={r.kind === "payment" || r.kind === "problem" ? "gold" : "outline"}>{KIND_LABEL[r.kind] ?? r.kind}</Badge>
                      <span className="text-[13px] text-muted-foreground">{new Date(r.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: user.timeZone })}</span>
                    </span>
                    <FeedbackStatus id={r.id} status={r.status} />
                  </div>
                  <p className="text-[15px] whitespace-pre-wrap">{r.message}</p>
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{who?.name ?? "Student"}</span>
                    {r.email && (
                      <a href={`mailto:${r.email}`} className="underline underline-offset-4 hover:text-foreground">
                        {r.email}
                      </a>
                    )}
                    {who?.phone && (
                      <a href={digits ? `https://wa.me/${digits}` : undefined} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">
                        {who.phone}
                      </a>
                    )}
                    {r.page && <span>from {r.page}</span>}
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
