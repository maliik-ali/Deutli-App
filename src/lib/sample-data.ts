/**
 * Sample data for the student dashboard UI.
 * Replaced with real database queries in later steps.
 */

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/dashboard/course", label: "My B1 course", icon: "book" },
  { href: "/dashboard/homework", label: "Homework", icon: "pen", count: 2 },
  { href: "/dashboard/mock-exams", label: "Mock exams", icon: "timer" },
  { href: "/dashboard/vocabulary", label: "Vocabulary", icon: "languages" },
  { href: "/dashboard/speaking-club", label: "Speaking club", icon: "mic" },
  { href: "/dashboard/ask-a-teacher", label: "Ask a teacher", icon: "message", count: 1 },
  { href: "/dashboard/certificates", label: "Certificates", icon: "award" },
] as const;

export type NavIcon = (typeof NAV_ITEMS)[number]["icon"];

export const studentStats = {
  streakDays: 12,
  coins: 340,
  exam: { name: "Goethe-Zertifikat B1", date: "2027-01-16T09:00:00+05:00" },
};

export const readiness = {
  overall: 68,
  skills: [
    { name: "Lesen", english: "Reading", value: 82, focus: false },
    { name: "Hören", english: "Listening", value: 74, focus: false },
    { name: "Schreiben", english: "Writing", value: 55, focus: true },
    { name: "Sprechen", english: "Speaking", value: 61, focus: true },
  ],
};

export const homeworkFeedback = {
  title: "Brief an die Vermieterin",
  task: "Schreiben Teil 1 · informal letter · 80 words",
  submitted: "Submitted yesterday",
  aiScore: 13,
  teacherScore: 14,
  maxScore: 20,
  teacher: "Frau Schneider",
  comment:
    "Good structure and a friendly tone. Watch your articles and put the verb at the end after “weil”.",
  corrections: [
    { wrong: "das Wohnung", right: "die Wohnung" },
    { wrong: "weil ich habe keine Zeit", right: "weil ich keine Zeit habe" },
  ],
};

export const continueLearning = {
  chapter: "Kapitel 7",
  title: "Wohnen und Umziehen",
  lesson: "Lesson 4 · Wechselpräpositionen",
  progress: 60,
  minutesLeft: 12,
};

export const speakingClub = {
  topic: "Über den letzten Urlaub sprechen",
  when: "Thursday, 7:00 PM PKT",
  host: "Herr Weber",
  spotsLeft: 2,
  spotsTotal: 8,
};

export const mockExam = {
  title: "B1 Mock exam 1",
  details: "All 4 skills · 3 h 10 min",
  lastAttempt: null as null | { score: number },
};

export const todaysWords = [
  { article: "der", noun: "Mietvertrag", english: "rental contract", urdu: "کرایہ نامہ" },
  { article: "die", noun: "Nebenkosten", english: "utility costs", urdu: "اضافی اخراجات" },
  { article: "der", noun: "Umzug", english: "move (house)", urdu: "نقل مکانی" },
  { article: "die", noun: "Kaution", english: "security deposit", urdu: "زرِ ضمانت" },
  { article: "das", noun: "Treppenhaus", english: "stairwell", urdu: "سیڑھیوں کا راستہ" },
];
