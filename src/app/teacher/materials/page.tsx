import type { Metadata } from "next";

import { MaterialAdminRow, NewMaterialForm } from "@/components/materials/material-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { listTeacherBatches } from "@/lib/batches/data";
import { KIND_LABEL, listDoneBy, listTeacherMaterials } from "@/lib/materials/data";

export const metadata: Metadata = { title: "Material and homework" };

export default async function TeacherMaterialsPage(props: PageProps<"/teacher/materials">) {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const ws = user.role === "teacher" ? await getMyWorkspace(user.id) : null;
  const batches = ws ? (await listTeacherBatches(user.id, ws.workspace.id, ws.role !== "teacher")).filter((b) => !b.archived) : [];
  const items = ws ? await listTeacherMaterials(user.id, ws.workspace.id, ws.role !== "teacher") : [];
  const doneNames = new Map(await Promise.all(items.filter((i) => i.kind === "homework" && i.done > 0).map(async (i) => [i.id, await listDoneBy(i.id)] as const)));
  const defaultBatch = typeof sp.batch === "string" ? sp.batch : undefined;

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Material and homework</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">Add notes, files, links and homework once, and share them with as many batches as you like. Students see them in their batch.</p>
      </header>
      {!ws ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">Material belongs to a teacher&apos;s workspace.</p>
      ) : (
        <div className="grid max-w-[960px] gap-6">
          <Card>
            <div className="grid gap-1"><CardTitle>Add something</CardTitle><CardDescription>One copy, shared with the batches you tick.</CardDescription></div>
            <NewMaterialForm batches={batches.map((b) => ({ id: b.id, name: b.name }))} defaultBatch={defaultBatch} />
          </Card>
          <Card>
            <CardTitle>Shared so far ({items.length})</CardTitle>
            {items.length === 0 ? <p className="text-[14px] text-muted-foreground">Nothing yet.</p> : (
              <ul className="divide-y divide-border">
                {items.map((m) => (
                  <li key={m.id} className="grid gap-2 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={m.kind === "homework" ? "gold" : "outline"}>{KIND_LABEL[m.kind]}</Badge>
                      <p className="font-semibold">{m.title}</p>
                      {m.due_on && <span className="text-[13px] text-muted-foreground">Due {m.due_on}</span>}
                      {m.file_name && <span className="text-[13px] text-muted-foreground">· {m.file_name}</span>}
                    </div>
                    {m.kind === "homework" && <p className="text-[13px] text-muted-foreground">{m.done} of {m.students} students marked it done{doneNames.get(m.id)?.length ? `: ${doneNames.get(m.id)!.join(", ")}` : ""}</p>}
                    <MaterialAdminRow id={m.id} batches={batches.map((b) => ({ id: b.id, name: b.name }))} shared={m.batches.map((b) => b.id)} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </main>
  );
}
