"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { assignTeacher, setTeacherRole } from "@/lib/teachers/actions";
import { OptionSelect } from "@/components/ui/option-select";

export type Person = { id: string; name: string; email: string | null; role: "student" | "teacher"; teacherId: string | null; code: string | null; students: number };

export function PersonRow({ person, teachers }: { person: Person; teachers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ error: string } | { ok: true }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if ("error" in r) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <li className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="truncate font-semibold">
          {person.name}
          {person.role === "teacher" && <span className="ml-2 rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-semibold text-gold-ink">Teacher</span>}
        </p>
        <p className="truncate text-[13px] text-muted-foreground">
          {person.email ?? "no email"}
          {person.role === "teacher" && ` · code ${person.code ?? "(made when they open /teacher)"} · ${person.students} student${person.students === 1 ? "" : "s"}`}
        </p>
        {error && (
          <p role="alert" className="text-[13px] text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {person.role === "student" && (
          <>
            <label className="sr-only" htmlFor={`t-${person.id}`}>
              Teacher of {person.name}
            </label>
            <OptionSelect
              id={`t-${person.id}`}
              value={person.teacherId ?? "none"}
              disabled={pending}
              onChange={(id) => run(() => assignTeacher(person.id, id === "none" ? "" : id))}
              options={[{ value: "none", label: "No teacher (standalone)" }, ...teachers.map((t) => ({ value: t.id, label: t.name }))]}
              className="h-11 w-auto min-w-52 text-[14px]"
            />
          </>
        )}
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => setTeacherRole(person.id, person.role !== "teacher"))}>
          {person.role === "teacher" ? "Make student" : "Make teacher"}
        </Button>
      </div>
    </li>
  );
}
