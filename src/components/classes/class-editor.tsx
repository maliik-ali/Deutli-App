import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { CancelClass } from "@/components/classes/cancel-class";
import { ClassForm } from "@/components/classes/class-form";
import { Registrants } from "@/components/classes/registrants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getClassForEdit, listCourseTitles, listTeacherOptions } from "@/lib/classes/data";
import { classToValues } from "@/lib/classes/form";
import { formatClock } from "@/lib/time";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Edit screen for one class: the form, the join link, who registered (with attendance) and Cancel. Teachers and admins share it. */
export async function ClassEditor({
  id,
  viewer,
  doneHref,
}: {
  id: string;
  viewer: { id: string; role: string; timeZone: string };
  doneHref: string;
}) {
  if (!UUID.test(id)) notFound();
  const isAdmin = viewer.role !== "teacher";
  const data = await getClassForEdit(id);
  if (data === null) notFound();
  if (data.unavailable) {
    return <p className="text-muted-foreground">Classes are not available right now. Please try again in a few minutes.</p>;
  }
  // A teacher can only open their own classes.
  if (!isAdmin && data.row.teacher_id !== viewer.id) notFound();

  const tz = viewer.timeZone;
  const [teachers, suggestions] = await Promise.all([isAdmin ? listTeacherOptions() : Promise.resolve(undefined), listCourseTitles(isAdmin ? null : viewer.id)]);
  const cancelled = data.row.status === "cancelled";
  const people = data.registrants.map((r) => ({
    userId: r.userId,
    name: r.name,
    avatarUrl: r.avatarUrl,
    joinedLabel: r.joinedAt ? `Joined at ${formatClock(r.joinedAt, tz)}` : null,
    attended: r.attended,
    rating: r.rating,
  }));
  const ratings = people.map((p) => p.rating).filter((n): n is number => n != null);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-6">
        {cancelled && (
          <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm font-medium text-destructive" role="status">
            This class is cancelled. Students who registered see it as cancelled.
          </p>
        )}
        <ClassForm
          initial={classToValues(data.row, { joinUrl: data.joinUrl, passcode: data.passcode }, tz)}
          mode="edit"
          teachers={teachers}
          courseSuggestions={suggestions}
          timeZone={tz}
          doneHref={doneHref}
        />
      </div>

      <div className="grid gap-6">
        <Card className="gap-4">
          <div className="grid gap-1">
            <CardTitle className="text-lg">Join link</CardTitle>
            <CardDescription>
              {data.joinUrl ? "Open your meeting to start the class." : "No link yet. Add one in the form so students can join."}
            </CardDescription>
          </div>
          {data.joinUrl && (
            <Button asChild variant="outline">
              <a href={data.joinUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden /> Open meeting
              </a>
            </Button>
          )}
        </Card>

        <Card className="gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-1">
              <CardTitle className="text-lg">Registered</CardTitle>
              <CardDescription>
                {data.registrants.length}
                {data.row.capacity != null && ` of ${data.row.capacity}`} students. Tick who was there after the class.
              </CardDescription>
            </div>
            {ratings.length > 0 && <Badge variant="gold">{(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)} ★ ({ratings.length})</Badge>}
          </div>
          <Registrants classId={data.row.id} people={people} />
        </Card>

        {!cancelled && <CancelClass classId={data.row.id} registered={data.registrants.length} doneHref={doneHref} />}
      </div>
    </div>
  );
}
