import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ExamPlayer } from "@/components/exam/exam-player";
import { hasPro, requireUser } from "@/lib/auth/dal";
import { getSavedWords } from "@/lib/practice/data";
import { paperExamLabel } from "@/lib/papers/template";
import { getAudioUrl, getPageText, getPageUrls, getPaperBySlug, openAttempt } from "@/lib/papers/data";

export const metadata: Metadata = { title: "Mock exam" };

export default async function TakeExamPage(props: PageProps<"/exam/take/[slug]">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const paper = await getPaperBySlug(slug);
  if (!paper) notFound();
  // Free papers are open to all; premium papers need an active Pro (admins can always test).
  if (!paper.is_free && !hasPro(user)) redirect(`/dashboard/exam/mock/${slug}`);

  const attempt = await openAttempt(user.id, paper.id, sp.new === "1");
  if (!attempt) redirect(`/dashboard/exam/mock/${slug}`);
  const [pageUrls, audioUrl, pageText, savedWords] = await Promise.all([getPageUrls(paper), getAudioUrl(paper), getPageText(paper.id), getSavedWords(user.id, 500)]);

  return (
    <ExamPlayer
      key={attempt.id}
      slug={paper.slug}
      title={paper.title}
      examLabel={paperExamLabel(paper.exam, paper.level)}
      attemptId={attempt.id}
      structure={paper.structure}
      pageUrls={pageUrls}
      audioUrl={audioUrl}
      initialAnswers={attempt.answers}
      initialWriting={attempt.writing}
      initialSpent={attempt.timer ?? {}}
      pageText={pageText}
      savedWords={savedWords}
      languages={user.languages}
    />
  );
}
