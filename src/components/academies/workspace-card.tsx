import { Building2 } from "lucide-react";

import { UsageMeter } from "@/components/academies/usage-meter";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";

export type WorkspaceCardData = {
  name: string;
  kind: "teacher" | "school";
  planName: string;
  priceLabel: string;
  students: number;
  maxStudents: number | null;
  teachers: number;
  maxTeachers: number | null;
  discountPercent: number;
  discountUntil: string | null;
  isOwner: boolean;
};

/** Teacher page: which workspace you work in, its plan, and students against the limit. */
export function WorkspaceCard({ data }: { data: WorkspaceCardData }) {
  const showTeachers = data.kind === "school";
  return (
    <Card className="grid gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
            <Building2 className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <CardTitle className="truncate">{data.name}</CardTitle>
            <p className="text-[13px] text-muted-foreground">{data.kind === "school" ? "School workspace" : "Your personal workspace"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="gold">{data.planName}</Badge>
          {data.discountPercent > 0 && <Badge variant="success">{data.discountPercent}% off{data.discountUntil ? ` until ${data.discountUntil}` : ""}</Badge>}
        </div>
      </div>
      <div className={showTeachers ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
        <UsageMeter label="Students" used={data.students} limit={data.maxStudents} />
        {showTeachers && <UsageMeter label="Teachers" used={data.teachers} limit={data.maxTeachers} />}
      </div>
      <p className="text-[13px] text-muted-foreground">
        {data.priceLabel}. {data.isOwner ? "To change your plan, write to us on the Support page." : "Only the workspace owner can change the plan."}
      </p>
    </Card>
  );
}
