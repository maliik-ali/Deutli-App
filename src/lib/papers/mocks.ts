import "server-only";

import { MOCK_EXAMS, type MockExam } from "@/lib/exam/catalog";
import { createClient } from "@/lib/supabase/server";
import { PAPER_BUCKET, getPapers } from "./data";

/** Mock exams for the student list: uploaded papers first, then the sample covers that have no paper yet. */
export async function listMocks(): Promise<{ mocks: MockExam[]; ready: Set<string> }> {
  const papers = (await getPapers()).filter((p) => p.is_published);
  const withCover = papers.filter((p) => p.cover_path);
  const urls = new Map<string, string>();
  if (withCover.length) {
    const supabase = await createClient();
    const { data } = await supabase.storage.from(PAPER_BUCKET).createSignedUrls(
      withCover.map((p) => p.cover_path as string),
      60 * 60 * 3,
    );
    data?.forEach((row, i) => row.signedUrl && urls.set(withCover[i].id, row.signedUrl));
  }
  const real: MockExam[] = papers.map((p) => ({
    id: p.slug,
    city: p.title,
    topics: p.topics,
    tone: p.tone,
    free: p.is_free,
    image: urls.get(p.id),
  }));
  const ids = new Set(real.map((m) => m.id));
  return { mocks: [...real, ...MOCK_EXAMS.filter((m) => !ids.has(m.id))], ready: ids };
}
