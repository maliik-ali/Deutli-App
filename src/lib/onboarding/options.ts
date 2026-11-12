/**
 * Onboarding questions and answers. Keep the ids in sync with the check on
 * public.profiles (migration 20261112000010_onboarding.sql).
 */

export const GOALS = [
  { id: "citizenship", label: "Becoming a German citizen", de: "Einbürgerung" },
  { id: "residence", label: "Permanent residence", de: "Niederlassungserlaubnis" },
  { id: "family", label: "Family reunion visa", de: "Familiennachzug" },
  { id: "ausbildung", label: "Vocational training", de: "Ausbildung" },
  { id: "university", label: "University", de: "Studienkolleg" },
  { id: "job", label: "Job or recognition", de: "Anerkennung" },
  { id: "integration", label: "Integration course", de: "Integrationskurs" },
] as const;
export const IMPROVE_GOAL = { id: "improve", label: "Just improving my German" } as const;
export type GoalId = (typeof GOALS)[number]["id"] | typeof IMPROVE_GOAL.id;

export const EXAMS = [
  { id: "goethe_b1", level: "B1", name: "Goethe-Zertifikat B1", note: "Goethe-Institut · the most common B1 exam" },
  { id: "telc_b1", level: "B1", name: "telc Deutsch B1", note: "Includes Sprachbausteine (grammar and words)" },
  { id: "oesd_b1", level: "B1", name: "ÖSD Zertifikat B1", note: "Austrian exam, accepted in Germany" },
  { id: "dtz", level: "A2–B1", name: "DTZ", note: "Integration course exam · A2 or B1 in one test" },
  { id: "other", level: "?", name: "Another exam or not sure yet", note: "We'll prepare you for B1 in general" },
] as const;
export type ExamId = (typeof EXAMS)[number]["id"];

export const TIMELINES = [
  { id: "1m", label: "Within 1 month", icon: "zap" },
  { id: "3m", label: "1–3 months", icon: "trend" },
  { id: "6m", label: "3–6 months", icon: "layers" },
  { id: "unsure", label: "Not sure yet", icon: "help" },
] as const;
export type TimelineId = (typeof TIMELINES)[number]["id"] | "date";

export type SkillId = "lesen" | "hoeren" | "schreiben" | "sprechen" | "sprachbausteine" | "unsure";

export const SKILLS: {
  id: SkillId;
  name: string;
  english: string;
  worry: string;
  /** Only for exams that have this part. */
  onlyFor?: ExamId[];
  about: string;
  parts: { title: string; text: string }[];
  help: string;
  start: { href: string; label: string; detail: string };
}[] = [
  {
    id: "lesen",
    name: "Lesen",
    english: "Reading",
    worry: "Long texts with difficult words — I can't finish in time",
    about:
      "In the reading part you read emails, short articles, adverts and notices, then find the key information. You don't need every word. You need to spot the important ones quickly.",
    parts: [
      { title: "Read for the main idea", text: "Skim a text first and decide what it is about before the details." },
      { title: "Find details fast", text: "Scan for names, dates, prices and the words from the question." },
    ],
    help: "Daily Practice gives you a short text every day: listen, read along and save every word you don't know. Your words come back in Vocabulary until you know them.",
    start: { href: "/dashboard/daily-practice", label: "Daily Practice", detail: "about 10 min" },
  },
  {
    id: "sprachbausteine",
    name: "Sprachbausteine",
    english: "Grammar & vocabulary",
    worry: "Dativ or Akkusativ, which preposition, adjective endings — grammar confuses me",
    onlyFor: ["telc_b1", "other"],
    about:
      "In telc B1 you fill gaps in a text. It tests the same patterns again and again: prepositions, verb forms, linking words and which word fits the meaning.",
    parts: [
      { title: "Grammar gaps", text: "Choose the right word: prepositions, verb forms, conjunctions." },
      { title: "Word gaps", text: "Pick the word that fits the meaning, like freuen auf or freuen über." },
    ],
    help: "Save the small words that trip you up while reading, then practise them in Vocabulary every day until they stick.",
    start: { href: "/dashboard/vocabulary", label: "Vocabulary", detail: "about 5 min" },
  },
  {
    id: "hoeren",
    name: "Hören",
    english: "Listening",
    worry: "People speak too fast — I keep missing important details",
    about:
      "In the listening part you hear announcements, phone messages, conversations and a discussion. Some recordings play twice, some only once, so you have to catch the key details the first time.",
    parts: [
      { title: "Read the questions first", text: "Know what to listen for before the audio starts." },
      { title: "Listen for key words", text: "Times, places, reasons and opinions: the rest is background." },
    ],
    help: "Daily Practice trains your ears in three rounds: listen only, listen and read, then speak along. You can slow the audio down to 0.75× while you get used to the speed.",
    start: { href: "/dashboard/daily-practice", label: "Daily Practice", detail: "about 10 min" },
  },
  {
    id: "schreiben",
    name: "Schreiben",
    english: "Writing",
    worry: "I don't know how to structure my email or what to write",
    about:
      "In the writing part you write emails or short posts: to a friend, to a teacher or boss, or giving your opinion. Each task tells you which points to cover, and a clear structure earns many of the marks.",
    parts: [
      { title: "Cover every point", text: "Answer each point from the task, one short paragraph each." },
      {
        title: "Use the right tone",
        text: "Du for friends, Sie for formal emails, with the right greeting and closing.",
      },
    ],
    help: "Homework with instant AI feedback, confirmed by your teacher, is coming to Deutli soon. Until then, Daily Practice builds the words and phrases you need for clear emails.",
    start: { href: "/dashboard/daily-practice", label: "Daily Practice", detail: "about 10 min" },
  },
  {
    id: "sprechen",
    name: "Sprechen",
    english: "Speaking",
    worry: "Speaking German makes me nervous — I don't have anyone to practise with",
    about:
      "In the speaking part you plan something together with a partner, present a topic and answer questions about it. The examiners want you to keep talking, react to your partner and explain your opinion.",
    parts: [
      { title: "Plan together", text: "Make suggestions, agree and disagree politely, find a solution." },
      { title: "Present a topic", text: "Talk about your experience and give your opinion with reasons." },
    ],
    help: "Speak along in Daily Practice every day to build fluency. A Speaking club to practise with other students is coming soon.",
    start: { href: "/dashboard/daily-practice", label: "Daily Practice", detail: "speak-along round" },
  },
  {
    id: "unsure",
    name: "I'm not sure",
    english: "Show me the exam",
    worry: "I'm new to the B1 exam — show me what it looks like",
    about:
      "The B1 exam has four skills: reading, listening, writing and speaking. You need a pass in each. Daily practice in small steps works better than long sessions before the exam.",
    parts: [
      { title: "Lesen and Hören", text: "Understand everyday texts, announcements and conversations." },
      { title: "Schreiben and Sprechen", text: "Write emails, give your opinion and talk with a partner." },
    ],
    help: "Start with Daily Practice: one short text a day. It trains reading, listening and speaking together, and builds your vocabulary as you go.",
    start: { href: "/dashboard/daily-practice", label: "Daily Practice", detail: "about 10 min" },
  },
];

export function skillById(id: string | null | undefined) {
  return SKILLS.find((s) => s.id === id);
}
export function examById(id: string | null | undefined) {
  return EXAMS.find((e) => e.id === id);
}
