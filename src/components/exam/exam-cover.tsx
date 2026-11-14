import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";

import type { CoverTone, MockExam } from "@/lib/exam/catalog";
import { cn } from "@/lib/utils";

const TONES: Record<CoverTone, string> = {
  navy: "bg-cover-navy",
  violet: "bg-cover-violet",
  teal: "bg-cover-teal",
  indigo: "bg-cover-indigo",
};

/**
 * A mock exam shown as a book cover: coloured top with the owl and a big "B1",
 * light lower half with the title and a round stamp. Sizes use container units
 * (cqw) so the cover looks the same at any card width.
 */
export function ExamCover({ exam, className }: { exam: MockExam; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      {/* page edges behind the cover */}
      <span aria-hidden className="absolute inset-y-1 -right-1.5 left-1 rounded-r-lg border border-border bg-card" />
      <div className="@container relative isolate aspect-[263/375] overflow-hidden rounded-r-lg rounded-l-[4px] border border-white/10 shadow-lg shadow-black/30">
        <div className={cn("relative h-[56%] overflow-hidden", TONES[exam.tone])}>
          <span
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgb(255_255_255/0.16),transparent_60%)]"
          />
          <span className="absolute top-[6cqw] left-[6.5cqw] font-heading text-[6.4cqw] font-extrabold tracking-tight text-white">
            deutli<span className="text-brand-cyan">.</span>
          </span>
          {exam.free && (
            <span className="absolute top-[5.5cqw] right-[6cqw] rounded-full bg-success-soft px-[3cqw] py-[0.8cqw] text-[4.2cqw] font-bold tracking-wider text-success">
              FREE
            </span>
          )}
          <Image
            src="/deutli-owl.png"
            alt=""
            width={282}
            height={300}
            className="absolute bottom-[-4cqw] left-[8cqw] h-[78%] w-auto drop-shadow-[0_8px_16px_rgb(0_0_0/0.35)]"
          />
          <span className="absolute right-[5cqw] bottom-[-3.5cqw] font-heading text-[34cqw] leading-none font-black tracking-[-0.06em] text-white">
            B1
          </span>
        </div>
        <div className="relative h-[44%] bg-cover-paper bg-[radial-gradient(rgb(11_23_57/0.07)_1px,transparent_1px)] [background-size:4cqw_4cqw] px-[6.5cqw] pt-[6cqw] text-cover-paper-ink">
          <p className="font-heading text-[8.6cqw] leading-[1.1] font-bold">
            {exam.city}
            <br />
            Modellprüfung
          </p>
          <Stamp className="absolute bottom-[6cqw] left-[6cqw] size-[24cqw]" />
          <span
            aria-hidden
            className="absolute top-[5cqw] right-[2.5cqw] text-[2.4cqw] font-semibold tracking-[0.2em] whitespace-nowrap text-cover-paper-ink/45 uppercase [writing-mode:vertical-rl]"
          >
            Deutsch als Fremdsprache
          </span>
        </div>
      </div>
    </div>
  );
}

function Stamp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn("text-cover-paper-ink", className)}>
      <defs>
        <path id="stamp-ring" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeWidth="2" />
      <text fontSize="10.5" fontWeight="700" letterSpacing="2.2" fill="currentColor">
        <textPath href="#stamp-ring">MODELLPRÜFUNG · DEUTLI.COM ·</textPath>
      </text>
      <text x="50" y="58" textAnchor="middle" fontSize="24" fontWeight="900" fill="currentColor">
        B1
      </text>
    </svg>
  );
}

/** Cover + the text under it; the whole card opens the exam. */
export function ExamCard({ exam, examName }: { exam: MockExam; examName: string }) {
  return (
    <Link
      href={`/dashboard/exam/mock/${exam.id}`}
      className="group grid content-start gap-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
    >
      <ExamCover exam={exam} className="mr-1.5 transition-transform duration-200 group-hover:-translate-y-1" />
      <div className="grid gap-1.5">
        <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase sm:text-[12px] sm:tracking-[0.12em]">
          {examName} ·<span className="max-sm:hidden">B1 ·</span>
          {exam.free ? (
            <span className="text-success">Free</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-gold-ink">
              <Lock className="size-3" aria-hidden />
              Premium
            </span>
          )}
        </p>
        <h3 className="flex items-center gap-1 text-lg font-bold">
          {exam.city}
          <ArrowUpRight
            className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gold-ink"
            aria-hidden
          />
        </h3>
        <p className="text-[14px] leading-relaxed text-muted-foreground">{exam.topics}</p>
      </div>
    </Link>
  );
}
