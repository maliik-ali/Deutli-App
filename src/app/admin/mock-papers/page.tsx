import type { Metadata } from "next";
import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { PaperRow } from "@/components/admin/paper-row";
import { PaperUploadForm } from "@/components/admin/paper-upload-form";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { PAPER_BUCKET, getPapers } from "@/lib/papers/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mock exam papers" };

export default async function AdminMockPapersPage() {
  await requireUser(["academy_admin", "super_admin"]);
  const papers = await getPapers();
  const covers = new Map<string, string>();
  const withCover = papers.filter((p) => p.cover_path);
  if (withCover.length) {
    const supabase = await createClient();
    const { data } = await supabase.storage.from(PAPER_BUCKET).createSignedUrls(withCover.map((p) => p.cover_path as string), 60 * 60);
    data?.forEach((row, i) => row.signedUrl && covers.set(withCover[i].id, row.signedUrl));
  }

  return (
    <AdminShell
      title="Mock exam papers"
      description="Upload a real telc B1 paper. Students solve it online: the paper on the left, the answer sheet on the right."
      back={{ href: "/admin", label: "Admin" }}
      actions={
        <Button asChild variant="outline">
          <Link href="/dashboard/exam">See the student page</Link>
        </Button>
      }
    >
      <Card>
        <div className="grid gap-1">
          <CardTitle className="text-lg">Papers</CardTitle>
          <CardDescription>Only published papers are visible to students.</CardDescription>
        </div>
        {papers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-muted-foreground">No papers yet. Add the first one below.</p>
        ) : (
          <ul className="grid gap-2">
            {papers.map((p) => (
              <PaperRow key={p.id} id={p.id} title={p.title} slug={p.slug} published={p.is_published} hasAudio={!!p.audio_path} tone={p.tone} free={p.is_free} coverUrl={covers.get(p.id) ?? null} />
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <div className="grid gap-1">
          <CardTitle className="text-lg">Add a paper</CardTitle>
          <CardDescription>Use the free Übungstests from telc.net.</CardDescription>
        </div>
        <PaperUploadForm />
      </Card>
    </AdminShell>
  );
}
