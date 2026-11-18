"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveClass } from "@/lib/classes/actions";
import { DURATIONS, durationText, LEVELS, REPEAT_OPTIONS, SKILLS, TIME_SLOTS, type LevelId, type SkillId } from "@/lib/classes/constants";
import { formatDayLong, timeZoneLabel } from "@/lib/time";
import { cn } from "@/lib/utils";

export type ClassFormValues = {
  id?: string;
  teacherId: string;
  courseTitle: string;
  title: string;
  description: string;
  syllabus: string;
  skill: SkillId;
  level: LevelId;
  /** YYYY-MM-DD in the editor's time zone. */
  date: string;
  /** HH:mm (24-hour) in the editor's time zone. */
  time: string;
  durationMin: number;
  /** Empty = no limit. */
  capacity: string;
  joinUrl: string;
  passcode: string;
};

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const selectClass = "h-11 rounded-xl text-[15px]";

function Field({ id, label, hint, optional, children }: { id: string; label: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>
        {label}
        {optional && <span className="ml-1 font-normal text-subtle-foreground">(optional)</span>}
      </Label>
      {children}
      {hint && <p className="text-[13px] text-subtle-foreground">{hint}</p>}
    </div>
  );
}

/** Create or edit a live class. Used by teachers (own classes) and admins (pick the teacher). */
export function ClassForm({
  initial,
  mode,
  teachers,
  courseSuggestions,
  timeZone,
  doneHref,
}: {
  initial: ClassFormValues;
  mode: "create" | "edit";
  /** Admins only: the teachers to choose from. */
  teachers?: { id: string; name: string }[];
  courseSuggestions: string[];
  timeZone: string;
  doneHref: string;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [repeat, setRepeat] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, startBusy] = useTransition();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const set = <K extends keyof ClassFormValues>(key: K, value: ClassFormValues[K]) => {
    setSaved(false);
    setV((old) => ({ ...old, [key]: value }));
  };
  const slots = TIME_SLOTS.some((s) => s.value === v.time) ? TIME_SLOTS : [{ value: v.time, label: v.time }, ...TIME_SLOTS];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startBusy(async () => {
      const capacity = v.capacity.trim() === "" ? null : Number(v.capacity);
      if (capacity !== null && !Number.isInteger(capacity)) {
        setError("Seats must be a whole number, or leave it empty for no limit.");
        return;
      }
      const r = await saveClass({
        id: v.id,
        teacherId: teachers ? v.teacherId || undefined : undefined,
        courseTitle: v.courseTitle,
        title: v.title,
        description: v.description,
        syllabus: v.syllabus,
        skill: v.skill,
        level: v.level,
        date: v.date,
        time: v.time,
        durationMin: v.durationMin,
        capacity,
        joinUrl: v.joinUrl,
        passcode: v.passcode,
        repeatWeeks: mode === "create" ? repeat : 1,
      });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      if (mode === "create") {
        router.push(doneHref);
      } else {
        setSaved(true);
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      <Card className="gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Class</CardTitle>
          <CardDescription>What students see when they pick a class.</CardDescription>
        </div>

        {teachers && (
          <Field id="teacher" label="Teacher">
            <Select value={v.teacherId} onValueChange={(x) => set("teacherId", x)}>
              <SelectTrigger id="teacher" className={selectClass}>
                <SelectValue placeholder="Choose a teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <Field id="courseTitle" label="Course" hint="Classes with the same course name are grouped on your profile as what you teach now.">
          <Input id="courseTitle" value={v.courseTitle} onChange={(e) => set("courseTitle", e.target.value)} placeholder="B1 Writing Workshop" maxLength={80} required />
          {courseSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Your earlier courses">
              {courseSuggestions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("courseTitle", c)}
                  className="inline-flex h-9 items-center rounded-full border border-border px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:border-gold-ink/60 hover:text-foreground"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </Field>

        <Field id="title" label="Class title">
          <Input id="title" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Schreiben Teil 1: Informal letter" maxLength={120} required />
        </Field>

        <Field id="description" label="Goal" optional hint="One line that tells students what they will get out of it.">
          <Input id="description" value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="Write a clear informal letter in 80 words." maxLength={300} />
        </Field>

        <Field
          id="syllabus"
          label="Syllabus"
          optional
          hint='Start a line with "- " for bullet points, or "## " for a small heading.'
        >
          <Textarea id="syllabus" value={v.syllabus} onChange={(e) => set("syllabus", e.target.value)} placeholder={"## Week 4: Letters\n- Greetings and closings\n- Giving reasons with weil"} maxLength={3000} rows={6} />
        </Field>
      </Card>

      <Card className="gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">When</CardTitle>
          <CardDescription>Times are in {timeZoneLabel(timeZone)}, your device&apos;s time zone. Students see them in their own.</CardDescription>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="date" label="Date">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  id="date"
                  className={cn(
                    "flex h-11 items-center justify-between gap-2 rounded-xl border border-input bg-card px-3.5 text-left text-[15px] outline-none transition-colors focus-visible:border-ink focus-visible:outline-[3px] focus-visible:outline-ink/20",
                    v.date ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {v.date ? formatDayLong(v.date) : "Pick a date"}
                  <CalendarDays className="size-5 text-gold-ink" aria-hidden />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start">
                <Calendar
                  mode="single"
                  weekStartsOn={1}
                  selected={v.date ? fromIso(v.date) : undefined}
                  defaultMonth={v.date ? fromIso(v.date) : undefined}
                  disabled={mode === "create" ? { before: new Date(new Date().setHours(0, 0, 0, 0)) } : undefined}
                  onSelect={(d) => {
                    if (!d) return;
                    set("date", toIso(d));
                    setCalendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </Field>

          <Field id="time" label="Start time">
            <Select value={v.time} onValueChange={(x) => set("time", x)}>
              <SelectTrigger id="time" className={selectClass}>
                <SelectValue placeholder="Pick a time" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {slots.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="duration" label="Length">
            <Select value={String(v.durationMin)} onValueChange={(x) => set("durationMin", Number(x))}>
              <SelectTrigger id="duration" className={selectClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {durationText(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {mode === "create" && (
            <Field id="repeat" label="Repeat" hint={repeat > 1 ? `Creates ${repeat} classes, one every week at the same time.` : undefined}>
              <Select value={String(repeat)} onValueChange={(x) => setRepeat(Number(x))}>
                <SelectTrigger id="repeat" className={selectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPEAT_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n === 1 ? "Just this class" : `Every week for ${n} weeks`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>
      </Card>

      <Card className="gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Who and where</CardTitle>
          <CardDescription>Who the class is for, and the link students use to join.</CardDescription>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="skill" label="Skill">
            <Select value={v.skill} onValueChange={(x) => set("skill", x as SkillId)}>
              <SelectTrigger id="skill" className={selectClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SKILLS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="level" label="Level">
            <Select value={v.level} onValueChange={(x) => set("level", x as LevelId)}>
              <SelectTrigger id="level" className={selectClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="capacity" label="Seats" optional hint="Empty = no limit.">
            <Input id="capacity" type="number" inputMode="numeric" min={1} max={500} value={v.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="12" />
          </Field>
        </div>

        <Field
          id="joinUrl"
          label="Join link"
          optional
          hint="Paste your Zoom meeting link. Students only see it after they register, 10 minutes before the class starts."
        >
          <Input id="joinUrl" type="url" inputMode="url" value={v.joinUrl} onChange={(e) => set("joinUrl", e.target.value)} placeholder="https://zoom.us/j/123456789" maxLength={500} />
        </Field>
        <Field id="passcode" label="Passcode" optional>
          <Input id="passcode" value={v.passcode} onChange={(e) => set("passcode", e.target.value)} maxLength={40} className="sm:max-w-xs" autoComplete="off" />
        </Field>
      </Card>

      {error && (
        <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success" role="status">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden /> Saved.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "Saving…" : mode === "create" ? (repeat > 1 ? `Create ${repeat} classes` : "Create class") : "Save changes"}
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href={doneHref}>{mode === "create" ? "Cancel" : "Back"}</Link>
        </Button>
      </div>
    </form>
  );
}
