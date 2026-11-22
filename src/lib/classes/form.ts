import type { ClassFormValues } from "@/components/classes/class-form";
import type { LevelId, SkillId } from "@/lib/classes/constants";
import { addDays, dayKeyIn, timeKeyIn } from "@/lib/time";

/** A blank new class: tomorrow at 18:00, one hour, B1 (what most students are preparing for). */
export function blankClass(tz: string, teacherId: string): ClassFormValues {
  return {
    teacherId,
    courseTitle: "",
    title: "",
    description: "",
    syllabus: "",
    skill: "general",
    level: "b1",
    date: addDays(dayKeyIn(tz, new Date()), 1),
    time: "18:00",
    durationMin: 60,
    capacity: "",
    joinUrl: "",
    passcode: "",
    recordingUrl: "",
  };
}

type Row = {
  id: string;
  teacher_id: string;
  course_title: string;
  title: string;
  description: string | null;
  syllabus: string | null;
  skill: string;
  level: string;
  starts_at: string;
  duration_min: number;
  capacity: number | null;
};

/** Form values for an existing class, with its date and time shown in the editor's time zone. */
export function classToValues(row: Row, link: { joinUrl: string; passcode: string }, tz: string, recordingUrl = ""): ClassFormValues {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    courseTitle: row.course_title,
    title: row.title,
    description: row.description ?? "",
    syllabus: row.syllabus ?? "",
    skill: row.skill as SkillId,
    level: row.level as LevelId,
    date: dayKeyIn(tz, row.starts_at),
    time: timeKeyIn(tz, row.starts_at),
    durationMin: row.duration_min,
    capacity: row.capacity == null ? "" : String(row.capacity),
    joinUrl: link.joinUrl,
    passcode: link.passcode,
    recordingUrl,
  };
}
