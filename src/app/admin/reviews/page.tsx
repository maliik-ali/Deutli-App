import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { ModerationButtons } from "@/components/reviews/moderation-buttons";
import { ReviewItem } from "@/components/reviews/review-item";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { REPORT_REASONS } from "@/lib/reviews/constants";
import { listReviewsForModeration } from "@/lib/reviews/data";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Reviews" };

const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;

export default async function AdminReviewsPage() {
  await requireUser(["academy_admin", "super_admin"]);
  const admin = createAdminClient();
  const items = admin ? await listReviewsForModeration(admin) : [];
  const open = items.filter((i) => i.reports.some((r) => !r.resolved));
  const hidden = items.filter((i) => i.hidden && !open.includes(i));

  const block = (list: typeof items, empty: string) =>
    list.length === 0 ? (
      <Card>
        <p className="text-[15px] text-muted-foreground">{empty}</p>
      </Card>
    ) : (
      <div className="grid gap-4">
        {list.map((r) => {
          const openReports = r.reports.filter((x) => !x.resolved);
          return (
            <Card key={r.id} className="gap-3">
              <ul>
                <ReviewItem review={r} showTeacher />
              </ul>
              {r.reports.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="Reports">
                  {r.reports.map((x, i) => (
                    <li key={i}>
                      <Badge variant={x.resolved ? "outline" : "gold"}>
                        {reasonLabel(x.reason)}
                        {x.note ? `: ${x.note}` : ""}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
              <ModerationButtons reviewId={r.id} hidden={r.hidden} hasOpenReports={openReports.length > 0} />
            </Card>
          );
        })}
      </div>
    );

  return (
    <AdminShell title="Reviews" description="Reviews students reported, and the ones you hid. Hiding removes a review from every page. The student can still see it, and you can bring it back." back={{ href: "/admin", label: "Admin" }}>
      <section className="grid gap-3" aria-labelledby="reported">
        <h2 id="reported" className="text-xl font-bold">Reported ({open.length})</h2>
        {block(open, "No reported reviews.")}
      </section>
      <section className="grid gap-3" aria-labelledby="hidden">
        <h2 id="hidden" className="text-xl font-bold">Hidden ({hidden.length})</h2>
        {block(hidden, "Nothing hidden.")}
      </section>
    </AdminShell>
  );
}
