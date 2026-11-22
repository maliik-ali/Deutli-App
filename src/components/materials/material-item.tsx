import { OpenMaterial, DoneToggle } from "@/components/materials/material-forms";
import { Badge } from "@/components/ui/badge";
import { KIND_LABEL, type Material } from "@/lib/materials/data";

/** One item as a student sees it: title, text, due date, open button and (for homework) a done tick. */
export function StudentMaterial({ m, done }: { m: Material; done: boolean }) {
  const hasFile = !!m.file_path;
  return (
    <li className="grid gap-2 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={m.kind === "homework" ? "gold" : "outline"}>{KIND_LABEL[m.kind]}</Badge>
        <p className="font-semibold">{m.title}</p>
        {m.due_on && <span className="text-[13px] text-muted-foreground">Due {m.due_on}</span>}
      </div>
      {m.body && <p className="text-[15px] whitespace-pre-line">{m.body}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {(hasFile || (m.kind === "link" && m.url)) && <OpenMaterial id={m.id} kind={m.kind} url={m.url} />}
        {m.kind === "homework" && <DoneToggle id={m.id} done={done} />}
      </div>
    </li>
  );
}
