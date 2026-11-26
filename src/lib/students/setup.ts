import "server-only";

import { cache } from "react";

import type { SetupStep } from "@/lib/setup-step";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The first things a new learner does, easiest first, and which are already done.
 * Each step ticks itself off from the student's own activity; nothing is stored. Server only.
 */
// `cache`: the sidebar and the dashboard page ask in the same request and share one answer.
export const getStudentSetup = cache(async (userId: string): Promise<SetupStep[]> => {
  const admin = createAdminClient();
  if (!admin) return [];
  const mine = (table: string) => admin.from(table).select("*", { count: "exact", head: true }).eq("user_id", userId);
  const [words, practised, mocks, classes] = await Promise.all([
    mine("vocabulary_words"),
    mine("practice_log"),
    mine("mock_attempts"),
    mine("class_registrations").eq("status", "registered"),
  ]);
  return [
    { key: "words", title: "Learn your first words", hint: "Ten words take about five minutes. They are saved so you can repeat them later.", href: "/dashboard/vocabulary", done: (words.count ?? 0) > 0 },
    { key: "practice", title: "Listen to one Daily Practice track", hint: "Listen, read along and speak along. Select any word to save it.", href: "/dashboard/daily-practice", done: (practised.count ?? 0) > 0 },
    { key: "mock", title: "Try a mock exam", hint: "The first one is free. You see your score for every skill.", href: "/dashboard/exam", done: (mocks.count ?? 0) > 0 },
    { key: "class", title: "Join a live class", hint: "Register, and the join link appears when the class opens.", href: "/dashboard/classes", done: (classes.count ?? 0) > 0 },
  ];
});
