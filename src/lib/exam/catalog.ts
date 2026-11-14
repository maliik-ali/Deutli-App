/**
 * B1 exam content catalogue (sample content until the mock exams are built).
 * Topics and city names are our own; the exam formats below describe the real Goethe and telc B1 exams.
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

export type ExamPart = {
  title: string;
  task: string;
  /** What the student does, in plain words. */
  detail: string;
  /** e.g. "6 questions", "about 80 words" */
  amount: string;
  /** Points for this part, when the exam gives them per part. */
  points?: number;
  /** Small extra fact, e.g. "Heard twice" or "20 minutes". */
  note?: string;
};

export type ExamSkill = {
  slug: SkillSlug;
  english: string;
  /** The name the exam itself uses, e.g. "Lesen" or "Leseverstehen". */
  german: string;
  minutes: number;
  /** Shown instead of plain minutes when the time needs a word, e.g. "about 30 minutes". */
  timeLabel: string;
  /** One line about the time, e.g. shared time or preparation time. */
  timeNote?: string;
  maxPoints: number;
  /** How the points count and what is needed to pass. */
  scoring: string;
  summary: string;
  parts: ExamPart[];
  /** An extra test that sits inside this section (telc: Sprachbausteine with Reading). */
  extra?: { title: string; english: string; intro: string; maxPoints: number; parts: ExamPart[] };
};

export type ExamFormat = {
  /** Full exam name shown to the student. */
  name: string;
  short: string;
  /** How the whole exam is passed. */
  passRule: string;
  /** Shown when we use this format for a student whose own exam we have not described yet. */
  skills: ExamSkill[];
};

/* Goethe-Zertifikat B1 (the ÖSD Zertifikat B1 is the same exam, made together). */
const GOETHE_SKILLS: ExamSkill[] = [
  {
    slug: "reading",
    english: "Reading",
    german: "Lesen",
    minutes: 65,
    timeLabel: "65 minutes",
    maxPoints: 100,
    scoring: "30 questions, counted up to 100 points. You pass this module with 60 points (18 right answers).",
    summary: "Five parts, from a personal blog to house rules. You read for the main idea and for details.",
    parts: [
      { title: "Teil 1", task: "Blog post or email", detail: "Read a personal text and decide: richtig or falsch.", amount: "6 questions" },
      { title: "Teil 2", task: "Newspaper articles", detail: "Two short press texts. Choose a, b or c.", amount: "6 questions" },
      { title: "Teil 3", task: "Adverts", detail: "Seven people are looking for something. Find the right advert for each.", amount: "7 questions" },
      { title: "Teil 4", task: "Opinions", detail: "Readers' comments on one topic: is the person for it, yes or no?", amount: "7 questions" },
      { title: "Teil 5", task: "Rules and instructions", detail: "House rules or instructions. Choose a, b or c.", amount: "4 questions" },
    ],
  },
  {
    slug: "listening",
    english: "Listening",
    german: "Hören",
    minutes: 40,
    timeLabel: "40 minutes",
    maxPoints: 100,
    scoring: "30 questions, counted up to 100 points. You pass this module with 60 points (18 right answers).",
    summary: "Announcements, a guided tour or talk, an everyday conversation and a radio discussion.",
    parts: [
      { title: "Teil 1", task: "Short texts", detail: "Five messages and announcements: richtig or falsch, and a, b or c.", amount: "10 questions", note: "Heard twice" },
      { title: "Teil 2", task: "Guided tour or talk", detail: "One longer text. Choose a, b or c.", amount: "5 questions", note: "Heard once" },
      { title: "Teil 3", task: "Conversation", detail: "Two people talk about everyday things: richtig or falsch.", amount: "7 questions", note: "Heard once" },
      { title: "Teil 4", task: "Radio discussion", detail: "Three people discuss a topic. Who says what?", amount: "8 questions", note: "Heard twice" },
    ],
  },
  {
    slug: "writing",
    english: "Writing",
    german: "Schreiben",
    minutes: 60,
    timeLabel: "60 minutes",
    maxPoints: 100,
    scoring: "Three texts, 100 points together. You pass this module with 60 points.",
    summary: "Three short texts: an email to a friend, your opinion in a forum and a polite formal email.",
    parts: [
      { title: "Teil 1", task: "Email to a friend", detail: "An informal email with three points to write about.", amount: "about 80 words", points: 40, note: "about 20 minutes" },
      { title: "Teil 2", task: "Forum post", detail: "Give your opinion on a topic from a TV or online discussion.", amount: "about 80 words", points: 40, note: "about 25 minutes" },
      { title: "Teil 3", task: "Formal email", detail: "A polite message, for example to a teacher or your boss.", amount: "about 40 words", points: 20, note: "about 15 minutes" },
    ],
  },
  {
    slug: "speaking",
    english: "Speaking",
    german: "Sprechen",
    minutes: 15,
    timeLabel: "about 15 minutes",
    timeNote: "With a partner, after 15 minutes of preparation time.",
    maxPoints: 100,
    scoring: "100 points: the three parts plus 16 points for pronunciation. You pass this module with 60 points.",
    summary: "With a partner: plan something together, give a short presentation and talk about it.",
    parts: [
      { title: "Teil 1", task: "Plan something together", detail: "Make a plan with your partner: suggest, react, agree.", amount: "about 3 minutes", points: 28 },
      { title: "Teil 2", task: "Present a topic", detail: "A short presentation with your own experience and opinion.", amount: "about 3 minutes each", points: 40 },
      { title: "Teil 3", task: "Talk about the presentation", detail: "Give feedback on your partner's talk and ask a question; answer theirs.", amount: "about 2 minutes each", points: 16 },
    ],
  },
];

/* telc Deutsch B1 (Zertifikat Deutsch), from the official practice test (Übungstest). */
const TELC_SKILLS: ExamSkill[] = [
  {
    slug: "reading",
    english: "Reading",
    german: "Leseverstehen",
    minutes: 90,
    timeLabel: "90 minutes",
    timeNote: "The 90 minutes are for Leseverstehen and Sprachbausteine together. You decide how to split the time.",
    maxPoints: 75,
    scoring: "75 points, a quarter (25%) of the whole exam. Each of the three parts gives up to 25 points.",
    summary: "Three parts: find the right headline, understand one longer text in detail, and find the right advert.",
    parts: [
      { title: "Teil 1", task: "Headlines", detail: "Five short texts and ten headlines. Find the headline for each text.", amount: "5 questions", points: 25, note: "Main idea" },
      { title: "Teil 2", task: "One longer text", detail: "Read a text such as a newspaper article. Choose a, b or c.", amount: "5 questions", points: 25, note: "Details" },
      { title: "Teil 3", task: "Adverts", detail: "Ten situations and twelve adverts. Find the advert for each situation.", amount: "10 questions", points: 25, note: "Finding information" },
    ],
    extra: {
      title: "Sprachbausteine",
      english: "Grammar and words",
      intro: "Only telc has this section. It is inside the same 90 minutes as reading and gives 30 points (10% of the exam).",
      maxPoints: 30,
      parts: [
        { title: "Teil 1", task: "Grammar", detail: "A letter or email with ten gaps. Choose a, b or c for each gap.", amount: "10 questions", points: 15 },
        { title: "Teil 2", task: "Words", detail: "A text with ten gaps and a list of words. Each word fits only once.", amount: "10 questions", points: 15 },
      ],
    },
  },
  {
    slug: "listening",
    english: "Listening",
    german: "Hörverstehen",
    minutes: 30,
    timeLabel: "about 30 minutes",
    timeNote: "The recording runs without a break. All questions are richtig or falsch.",
    maxPoints: 75,
    scoring: "75 points, a quarter (25%) of the whole exam. Each of the three parts gives up to 25 points.",
    summary: "Three parts: five people give their opinion, one longer conversation and five short texts.",
    parts: [
      { title: "Teil 1", task: "Five opinions", detail: "Five people talk about one topic. Decide: richtig or falsch.", amount: "5 questions", points: 25, note: "Heard once" },
      { title: "Teil 2", task: "Conversation", detail: "One longer conversation or interview. Decide: richtig or falsch.", amount: "10 questions", points: 25, note: "Heard twice" },
      { title: "Teil 3", task: "Five short texts", detail: "Announcements and messages. Decide: richtig or falsch.", amount: "5 questions", points: 25, note: "Heard twice" },
    ],
  },
  {
    slug: "writing",
    english: "Writing",
    german: "Schriftlicher Ausdruck",
    minutes: 30,
    timeLabel: "30 minutes",
    maxPoints: 45,
    scoring:
      "45 points, 15% of the whole exam. The email is marked on three things: content (all four points covered), how well it reads as a letter, and correct German.",
    summary: "One task: answer an email, informal or half-formal, and write about four given points.",
    parts: [
      { title: "E-Mail", task: "Answer an email", detail: "Write about all four points, in an order that makes sense, with a subject line, greeting and ending.", amount: "4 points to cover", points: 45 },
    ],
  },
  {
    slug: "speaking",
    english: "Speaking",
    german: "Mündlicher Ausdruck",
    minutes: 15,
    timeLabel: "about 15 minutes",
    timeNote: "With a partner, after 20 minutes of preparation time.",
    maxPoints: 75,
    scoring: "75 points, a quarter (25%) of the whole exam. You need at least 45 of them to pass.",
    summary: "With a partner: get to know each other, talk about a topic and plan something together.",
    parts: [
      { title: "Teil 1", task: "Get to know each other", detail: "Tell your partner about yourself and ask them questions.", amount: "about 3 minutes", points: 15 },
      { title: "Teil 2", task: "Talk about a topic", detail: "You each have a text with an opinion. Tell each other about it, then give your own view and experience.", amount: "about 6 minutes", points: 30 },
      { title: "Teil 3", task: "Plan something together", detail: "Organise something, for example a party or a trip: make suggestions and decide who does what.", amount: "about 6 minutes", points: 30 },
    ],
  },
];

const GOETHE_PASS =
  "Each of the four modules has 100 points and is passed on its own with 60 points. You can take or repeat a single module.";

const FORMATS: Record<string, ExamFormat> = {
  goethe_b1: { name: "Goethe-Zertifikat B1", short: "Goethe", passRule: GOETHE_PASS, skills: GOETHE_SKILLS },
  oesd_b1: { name: "ÖSD Zertifikat B1", short: "ÖSD", passRule: GOETHE_PASS, skills: GOETHE_SKILLS },
  telc_b1: {
    name: "telc Deutsch B1",
    short: "telc",
    passRule:
      "The whole exam has 300 points. To pass you need 60% in both halves: 135 of 225 points in the written exam (reading, Sprachbausteine, listening, writing) and 45 of 75 points in speaking.",
    skills: TELC_SKILLS,
  },
};

/**
 * The exam format to show a student. Students who chose the DTZ, another exam
 * or nothing yet see the Goethe B1 format (`exact` is false, so pages can say so).
 */
export function getExamFormat(exam: string | null): ExamFormat & { exact: boolean } {
  const format = exam ? FORMATS[exam] : undefined;
  return format ? { ...format, exact: true } : { ...FORMATS.goethe_b1, exact: false };
}

export const SKILL_SLUGS: SkillSlug[] = ["reading", "listening", "writing", "speaking"];

/** Short label for the cover eyebrow, from the student's chosen exam. */
export function examShortName(exam: string | null) {
  switch (exam?.split("_")[0]) {
    case "telc":
      return "telc";
    case "oesd":
      return "ÖSD";
    case "dtz":
      return "DTZ";
    default:
      return "Goethe";
  }
}
