import type { Metadata } from "next";
import Link from "next/link";

import { BlurFade } from "@/components/magicui/blur-fade";
import { MotionProvider } from "@/components/magicui/motion-provider";
import { ExamCard } from "@/components/exam/exam-cover";
import { Button } from "@/components/ui/button";
import { hasPro, requireUser } from "@/lib/auth/dal";
// import { myExamTitle } from "@/lib/exam/choice"; // MVP: switched off, B1 only
import { examShortName } from "@/lib/exam/catalog";
import { listMocks } from "@/lib/papers/mocks";

export const metadata: Metadata = { title: "My B1 Exam" };

export default async function ExamPage() {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const examName = examShortName(user.exam);
  const { mocks } = await listMocks();
  const freeMocks = mocks.filter((m) => m.free);
  const premiumMocks = mocks.filter((m) => !m.free);
  const pro = hasPro(user) && user.role === "student";

  return (
    <MotionProvider>
    <main className="mx-auto grid max-w-[1240px] gap-8 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-2">
        <h1 className="text-[28px] font-extrabold sm:text-[32px]">My B1 Exam{/* later: {myExamTitle(user.exam)} */}</h1>
        <p className="max-w-2xl text-muted-foreground">
          Full mock exams with all four parts, timed like the real day. Free exams you can start right now. Premium
          exams unlock with Deutli Pro. To train one skill at a time, open Skills in the menu.
        </p>
      </header>

      {[
        { id: "free", title: "Free", note: "Start these right now", list: freeMocks },
        { id: "premium", title: "Premium", note: pro ? "Included in your Pro" : "Unlock with Deutli Pro", list: premiumMocks },
      ]
        .filter((g) => g.list.length > 0)
        .map((g) => (
          <section key={g.id} aria-labelledby={`mocks-${g.id}`} className="grid gap-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id={`mocks-${g.id}`} className="text-xl font-bold">
                {g.title} <span className="text-[14px] font-normal text-muted-foreground">· {g.list.length} {g.list.length === 1 ? "exam" : "exams"} · {g.note}</span>
              </h2>
              {g.id === "premium" && !pro && (
                <Button asChild size="sm" variant="outline" className="h-11 sm:h-9">
                  <Link href="/dashboard/upgrade">Go Pro</Link>
                </Button>
              )}
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
              {g.list.map((exam, i) => (
                <li key={exam.id}>
                  <BlurFade delay={Math.min(i, 8) * 0.05}>
                    <ExamCard exam={exam} examName={examName} />
                  </BlurFade>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </main>
    </MotionProvider>
  );
}
