import "server-only";

import { MOCK_EXAMS, type MockExam } from "@/lib/exam/catalog";
import { getPapers } from "./data";

/** Mock exams for the student list: uploaded papers first, then the sample covers that have no paper yet. */
export async function listMocks(): Promise<{ mocks: MockExam[]; ready: Set<string> }> {
  const papers = (await getPapers()).filter((p) => p.is_published);
  const real: MockExam[] = papers.map((p) => ({ id: p.slug, city: p.title, topics: p.topics, tone: p.tone, free: p.is_free }));
  const ids = new Set(real.map((m) => m.id));
  return { mocks: [...real, ...MOCK_EXAMS.filter((m) => !ids.has(m.id))], ready: ids };
}
