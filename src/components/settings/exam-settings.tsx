"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXAM_PROVIDERS, getProvider, parseExamId, type ExamProviderId } from "@/lib/exam/choice";
import { setMyExam } from "@/lib/settings/actions";

/** Dropdowns for the exam and level the student is preparing for. */
export function ExamSettings({ exam }: { exam: string | null }) {
  const initial = parseExamId(exam);
  const [provider, setProvider] = useState<ExamProviderId>(initial.provider);
  const [level, setLevel] = useState<string>(initial.level ?? "B1");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const levels = getProvider(provider)?.levels ?? [];
  const examId = levels.length ? `${provider}_${level.toLowerCase()}` : provider;
  const unchanged = examId === (exam ?? "goethe_b1");

  function changeProvider(id: ExamProviderId) {
    setProvider(id);
    const next = getProvider(id)?.levels ?? [];
    if (next.length && !(next as readonly string[]).includes(level)) setLevel("B1");
    setSaved(false);
  }

  function save() {
    setError(null);
    start(async () => {
      const r = await setMyExam(examId);
      if ("error" in r) setError(r.error);
      else setSaved(true);
    });
  }

  return (
    <Card className="grid gap-5 p-6">
      <div className="grid gap-1">
        <CardTitle>Exam you are preparing for</CardTitle>
        <CardDescription>We show the format of this exam in My Exam.</CardDescription>
      </div>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <label className="grid gap-2 text-sm font-semibold">
          Exam
          <Select value={provider} onValueChange={(v) => changeProvider(v as ExamProviderId)}>
            <SelectTrigger aria-label="Exam">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXAM_PROVIDERS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        {levels.length > 0 && (
          <label className="grid gap-2 text-sm font-semibold">
            Level
            <Select
              value={level}
              onValueChange={(v) => {
                setLevel(v);
                setSaved(false);
              }}
            >
              <SelectTrigger aria-label="Level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {levels.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}
      </div>
      {provider !== "dtz" && provider !== "other" && level !== "B1" && (
        <p className="text-[14px] text-muted-foreground">
          Detailed exam formats are ready for B1. For other levels you will see the Goethe B1 format for now.
        </p>
      )}
      {error && (
        <p role="alert" className="text-[14px] text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={busy || (unchanged && !saved)}>
          {busy ? "Saving…" : "Save"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-[14px] text-muted-foreground" role="status">
            <CheckCircle2 className="size-4" aria-hidden /> Saved
          </span>
        )}
      </div>
    </Card>
  );
}
