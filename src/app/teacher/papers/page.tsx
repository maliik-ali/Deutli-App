import type { Metadata } from "next";

import { PaperUploadForm } from "@/components/admin/paper-upload-form";
import { TeacherPaperRow } from "@/components/admin/teacher-paper-row";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { listTeacherBatches } from "@/lib/batches/data";
import { listTeacherPapers } from "@/lib/papers/teacher-data";

export const metadata: Metadata = { title: "My papers" };

export default async function TeacherPapersPage() {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const ws = user.role === "teacher" ? await getMyWorkspace(user.id) : null;
  const [papers, batches] = ws ? await Promise.all([listTeacherPapers(user.id), listTeacherBatches(user.id, ws.workspace.id, false)]) : [[], []];
  return (
    <main className="mx-auto grid max-w-[960px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">My papers</h1>
        <p className="text-[15px] text-muted-foreground">Upload your own mock exam papers for your batches. Only the students you choose can open them. Answer keys stay on the server.</p>
      </header>
      {!ws ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">Private papers belong to a teacher&apos;s workspace. Admins add public papers under Mock exam papers.</p>
      ) : (
        <>
          <Card>
            <CardTitle>Your papers ({papers.length})</CardTitle>
            {papers.length === 0 ? <p className="text-[14px] text-muted-foreground">None yet.</p> : <ul className="divide-y divide-border">{papers.map((p) => <TeacherPaperRow key={p.id} id={p.id} title={p.title} published={p.is_published} visibility={p.visibility} />)}</ul>}
          </Card>
          <Card>
            <div className="grid gap-1"><CardTitle>Add a paper</CardTitle><CardDescription>telc Deutsch B1 format. Saved as a draft; publish it from the list.</CardDescription></div>
            <PaperUploadForm teacher={{ batches: batches.filter((b) => !b.archived).map((b) => ({ id: b.id, name: b.name })) }} />
          </Card>
        </>
      )}
    </main>
  );
}
