import { z } from "zod";

/** Answers a new teacher or school gives while setting up a free workspace (shown on /onboarding/teacher). */
export const ACCOUNT_TYPES = [
  { id: "solo", title: "I teach on my own", text: "Your own students, classes and material. Free for up to 5 active students." },
  { id: "school", title: "I run a school or academy", text: "Several teachers in one workspace, with your own logo and colours." },
] as const;

export const EXAMS = [
  { id: "goethe", label: "Goethe" },
  { id: "telc", label: "telc" },
  { id: "oesd", label: "ÖSD" },
  { id: "dtz", label: "DTZ" },
  { id: "other", label: "Other" },
] as const;

export const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

export const STUDENT_COUNTS = [
  { id: "1-5", label: "1–5" },
  { id: "6-30", label: "6–30" },
  { id: "31-100", label: "31–100" },
  { id: "100+", label: "100+" },
] as const;

export const TOOLS = [
  { id: "whatsapp", label: "WhatsApp groups" },
  { id: "video", label: "Zoom or Google Meet" },
  { id: "drive", label: "Google Drive" },
  { id: "paper", label: "Paper and Excel" },
  { id: "website", label: "My own website" },
  { id: "nothing", label: "Nothing yet" },
] as const;

export const WANTS = [
  { id: "live", label: "Live classes" },
  { id: "homework", label: "Homework and feedback" },
  { id: "mocks", label: "Mock exams" },
  { id: "tests", label: "Chapter tests" },
  { id: "attendance", label: "Attendance" },
  { id: "branding", label: "My own logo and colours" },
] as const;

const ids = <T extends readonly { id: string }[]>(list: T) => list.map((x) => x.id) as [T[number]["id"], ...T[number]["id"][]];

export const teacherSignupSchema = z.object({
  accountType: z.enum(["solo", "school"]),
  name: z.string().trim().min(2, "Enter your name or your school's name.").max(80, "That name is too long. Use 80 characters or fewer."),
  exams: z.array(z.enum(ids(EXAMS))).max(5),
  levels: z.array(z.enum(LEVELS)).max(5),
  studentCount: z.enum(ids(STUDENT_COUNTS)).nullable(),
  tools: z.array(z.enum(ids(TOOLS))).max(6),
  wants: z.array(z.enum(ids(WANTS))).max(6),
});

export type TeacherSignupInput = z.infer<typeof teacherSignupSchema>;
