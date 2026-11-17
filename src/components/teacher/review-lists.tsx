import Link from "next/link";

import { TakeButton } from "@/components/teacher/take-button";
import { Card, CardTitle } from "@/components/ui/card";
import { shortDate, sourceLabel, type ReviewRow } from "@/lib/teachers/data";

type Names = Map<string, string>;

export function ToCheckCard({ rows, names, limit, timeZone }: { rows: ReviewRow[]; names: Names; limit?: number; timeZone: string }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <Card className="grid gap-2 p-6">
      <CardTitle>To check ({rows.length})</CardTitle>
      {rows.length === 0 ? (
        <p className="text-[14px] text-muted-foreground">Nothing waiting. New emails from your students appear here.</p>
      ) : (
        <ul className="divide-y divide-border">
          {shown.map((r) => (
            <li key={r.id}>
              <Link href={`/teacher/review/${r.id}`} className="flex min-h-14 items-center justify-between gap-3 py-2">
                <span>
                  <span className="font-semibold">{names.get(r.student_id) ?? "Student"}</span>
                  <span className="block text-[13px] text-muted-foreground">
                    {sourceLabel(r.source)} · {shortDate(r.created_at, timeZone)}
                  </span>
                </span>
                <span className="text-[14px] font-medium text-gold-ink">Check</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {limit && rows.length > limit && (
        <Link href="/teacher/reviews" className="text-[14px] font-medium text-gold-ink">
          See all {rows.length}
        </Link>
      )}
    </Card>
  );
}

export function OpenRequestsCard({ rows, names, timeZone }: { rows: ReviewRow[]; names: Names; timeZone: string }) {
  return (
    <Card className="grid gap-2 p-6">
      <CardTitle>Open requests ({rows.length})</CardTitle>
      <p className="text-[13px] text-muted-foreground">Students without a teacher asked for a check. Take one to check it.</p>
      {rows.length > 0 && (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-3">
              <span>
                <span className="font-semibold">{names.get(r.student_id) ?? "Student"}</span>
                <span className="block text-[13px] text-muted-foreground">{shortDate(r.created_at, timeZone)}</span>
              </span>
              <TakeButton reviewId={r.id} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function CheckedCard({ rows, names, limit, timeZone }: { rows: ReviewRow[]; names: Names; limit?: number; timeZone: string }) {
  if (rows.length === 0) return null;
  return (
    <Card className="grid gap-2 p-6">
      <CardTitle>Checked ({rows.length})</CardTitle>
      <ul className="divide-y divide-border">
        {(limit ? rows.slice(0, limit) : rows).map((r) => (
          <li key={r.id}>
            <Link href={`/teacher/review/${r.id}`} className="flex min-h-12 items-center justify-between gap-3 py-2 text-[14px] hover:underline">
              <span>{names.get(r.student_id) ?? "Student"}</span>
              <span className="text-muted-foreground">
                {r.total} / 45 · {shortDate(r.created_at, timeZone)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
