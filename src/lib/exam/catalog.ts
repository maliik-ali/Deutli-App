/**
 * B1 exam content catalogue (sample content until the mock exams are built).
 * Topics and city names are our own; part structure follows the Goethe-Zertifikat B1.
 */

export type CoverTone = "navy" | "violet" | "teal" | "indigo";

export type MockExam = {
  id: string;
  city: string;
  topics: string;
  tone: CoverTone;
  free: boolean;
};

export const MOCK_EXAMS: MockExam[] = [
  { id: "hamburg", city: "Hamburg", topics: "Hafenrundfahrt, Nachbarschaftshilfe, Fahrradstraßen", tone: "navy", free: true },
  { id: "koeln", city: "Köln", topics: "Karnevalsverein, Homeoffice, Second-Hand-Mode", tone: "violet", free: false },
  { id: "muenchen", city: "München", topics: "Wohnungssuche, Biergarten-Regeln, Ehrenamt", tone: "teal", free: false },
  { id: "leipzig", city: "Leipzig", topics: "Sprachcafé, Ausbildung im Handwerk, Stadtgarten", tone: "indigo", free: false },
  { id: "bremen", city: "Bremen", topics: "Online-Einkauf, Vereinsleben, Lieferdienste", tone: "violet", free: false },
  { id: "dresden", city: "Dresden", topics: "Arzttermin, Mülltrennung, Tag der offenen Tür", tone: "navy", free: false },
  { id: "freiburg", city: "Freiburg", topics: "Solarenergie, WG-Leben, Wochenmarkt", tone: "indigo", free: false },
  { id: "kiel", city: "Kiel", topics: "Segelkurs, Pflegeberuf, Bibliothek der Dinge", tone: "teal", free: false },
];

export function getMockExam(id: string) {
  return MOCK_EXAMS.find((e) => e.id === id);
}

export type SkillSlug = "reading" | "listening" | "writing" | "speaking";

export type ExamSkill = {
  slug: SkillSlug;
  english: string;
  german: string;
  minutes: number;
  summary: string;
  parts: { title: string; task: string; detail: string }[];
};

export const EXAM_SKILLS: ExamSkill[] = [
  {
    slug: "reading",
    english: "Reading",
    german: "Lesen",
    minutes: 65,
    summary: "Five texts, from a personal blog to house rules. You read for the main idea and for details.",
    parts: [
      { title: "Teil 1", task: "Blog post", detail: "Read a personal text and decide: richtig or falsch · 6 questions" },
      { title: "Teil 2", task: "Newspaper articles", detail: "Two press texts, choose a, b or c · 6 questions" },
      { title: "Teil 3", task: "Adverts", detail: "Match people to the right advert · 7 questions" },
      { title: "Teil 4", task: "Opinions", detail: "Readers' comments: is the person for or against? · 7 questions" },
      { title: "Teil 5", task: "Rules and instructions", detail: "House rules or terms, choose a, b or c · 4 questions" },
    ],
  },
  {
    slug: "listening",
    english: "Listening",
    german: "Hören",
    minutes: 40,
    summary: "Announcements, a guided tour, a conversation and a radio discussion.",
    parts: [
      { title: "Teil 1", task: "Short texts", detail: "Messages and announcements, heard twice · 10 questions" },
      { title: "Teil 2", task: "Guided tour or talk", detail: "One longer text, heard once · 5 questions" },
      { title: "Teil 3", task: "Conversation", detail: "Everyday talk between two people: richtig or falsch · 7 questions" },
      { title: "Teil 4", task: "Radio discussion", detail: "Who says what? Match the opinions · 8 questions" },
    ],
  },
  {
    slug: "writing",
    english: "Writing",
    german: "Schreiben",
    minutes: 60,
    summary: "Three short texts: an email to a friend, a forum post with your opinion and a polite formal email.",
    parts: [
      { title: "Teil 1", task: "Email to a friend", detail: "Informal, about 80 words · 20 minutes" },
      { title: "Teil 2", task: "Forum post", detail: "Give your opinion on a topic, about 80 words · 25 minutes" },
      { title: "Teil 3", task: "Formal email", detail: "Polite message, e.g. to a teacher or boss, about 40 words · 15 minutes" },
    ],
  },
  {
    slug: "speaking",
    english: "Speaking",
    german: "Sprechen",
    minutes: 15,
    summary: "With a partner: plan something together, give a short presentation and answer questions.",
    parts: [
      { title: "Teil 1", task: "Plan something together", detail: "Agree on a plan with your partner · about 3 minutes" },
      { title: "Teil 2", task: "Presentation", detail: "Present a topic with your own experience · about 3 minutes" },
      { title: "Teil 3", task: "Feedback and questions", detail: "React to your partner's talk and answer questions · about 2 minutes" },
    ],
  },
];

export function getExamSkill(slug: string) {
  return EXAM_SKILLS.find((s) => s.slug === slug);
}

/** Short label for the cover eyebrow, from the student's chosen exam. */
export function examShortName(exam: string | null) {
  switch (exam) {
    case "telc_b1":
      return "telc";
    case "oesd_b1":
      return "ÖSD";
    case "dtz":
      return "DTZ";
    default:
      return "Goethe";
  }
}
