import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { DeleteButton, PublishButton, TrackForm } from "@/components/admin/practice-forms";
import { TrackRow } from "@/components/admin/track-row";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { getAdminSet } from "@/lib/practice/data";

export const metadata: Metadata = { title: "Edit practice set" };

export default async function AdminPracticeSetPage(props: PageProps<"/admin/daily-practice/[setId]">) {
  await requireUser(["academy_admin", "super_admin"]);
  const { setId } = await props.params;
  const set = await getAdminSet(setId);
  if (!set) notFound();

  return (
    <AdminShell
      title={set.title}
      description={set.description ?? undefined}
      back={{ href: "/admin/daily-practice", label: "All sets" }}
      actions={<PublishButton setId={set.id} published={set.isPublished} />}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="gold">{set.level}</Badge>
        <Badge variant={set.isPublished ? "success" : "outline"}>
          {set.isPublished ? "Published: students can see it" : "Draft: only admins can see it"}
        </Badge>
      </div>

      <Card>
        <div className="grid gap-1">
          <CardTitle className="text-lg">Texts in this set</CardTitle>
          <CardDescription>Students practise them in this order.</CardDescription>
        </div>
        {set.tracks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-muted-foreground">
            No texts yet. Add the first one below.
          </p>
        ) : (
          <ol className="grid gap-3">
            {set.tracks.map((t, i) => (
              <TrackRow
                key={t.id}
                setId={set.id}
                number={i + 1}
                track={{ id: t.id, title: t.title, transcript: t.transcript, hasAudio: Boolean(t.audioPath) }}
              />
            ))}
          </ol>
        )}
      </Card>

      <Card>
        <div className="grid gap-1">
          <CardTitle className="text-lg">Add a text</CardTitle>
          <CardDescription>
            Keep each text short (1 to 3 minutes of audio). Only upload texts and audio you wrote yourself or have
            permission to use.
          </CardDescription>
        </div>
        <TrackForm setId={set.id} />
      </Card>

      <div className="flex justify-end">
        <DeleteButton kind="set" id={set.id} label="Delete this set" redirectTo="/admin/daily-practice" />
      </div>
    </AdminShell>
  );
}
