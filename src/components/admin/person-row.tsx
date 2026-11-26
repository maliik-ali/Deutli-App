"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setTeacherVerified } from "@/lib/reputation/actions";
import { assignTeacher, deleteUserAccount, setTeacherRole } from "@/lib/teachers/actions";
import { OptionSelect } from "@/components/ui/option-select";

export type Person = { id: string; name: string; email: string | null; role: "student" | "teacher"; teacherId: string | null; code: string | null; students: number; verified?: boolean };

export function PersonRow({ person, teachers }: { person: Person; teachers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState("");

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
          {person.verified && <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success"><BadgeCheck className="size-3" aria-hidden /> Verified</span>}
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
        {person.role === "teacher" && (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => setTeacherVerified(person.id, !person.verified))}>
            {person.verified ? "Remove verified" : "Mark verified"}
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => setTeacherRole(person.id, person.role !== "teacher"))}>
          {person.role === "teacher" ? "Make student" : "Make teacher"}
        </Button>
        {!deleting && (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setDeleting(true)} className="text-destructive hover:text-destructive">
            <Trash2 aria-hidden /> Delete
          </Button>
        )}
      </div>
      {deleting && (
        <form
          className="grid gap-3 rounded-xl border border-destructive/40 bg-destructive-soft/40 p-4 sm:col-span-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => deleteUserAccount(person.id, confirm));
          }}
        >
          <p className="text-[14px]">
            Delete <strong>{person.name}</strong> for good? Their profile, progress and results are removed and they can&apos;t log in again.
            {person.role === "teacher" && ` Their workspace, classes and join code are removed too${person.students ? `, and their ${person.students} student${person.students === 1 ? "" : "s"} become standalone` : ""}.`} Payment records are kept without a name.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1">
              <label htmlFor={`d-${person.id}`} className="text-[13px] font-semibold">
                Type DELETE to confirm
              </label>
              <input
                id={`d-${person.id}`}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                autoFocus
                className="h-11 w-44 rounded-lg border border-input bg-background px-3 text-[14px]"
              />
            </div>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => { setDeleting(false); setConfirm(""); setError(null); }}>
              Cancel
            </Button>
            <Button type="submit" variant="ink" disabled={pending || confirm.trim().toUpperCase() !== "DELETE"} className="bg-destructive font-semibold text-background hover:bg-destructive/90">
              {pending ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}
