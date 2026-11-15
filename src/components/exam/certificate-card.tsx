import Link from "next/link";
import { ArrowRight, Award } from "lucide-react";

import { PracticeCertificate, type CertScores } from "@/components/exam/practice-certificate";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

/** Small peek at the certificate. Tapping the card opens the big one on the Certificates page. */
export function CertificateCard({ attemptId, scores }: { attemptId: string; scores: CertScores }) {
  return (
    <Card className="group relative h-full overflow-hidden transition-colors hover:border-gold-ink/60">
      <div className="grid gap-1">
        <CardTitle className="flex items-center gap-2">
          <Award className="size-4 text-gold-ink" aria-hidden /> Certificate preview
        </CardTitle>
        <CardDescription>See how your result looks on a real B1 certificate.</CardDescription>
      </div>
      <div aria-hidden className="relative h-44 overflow-hidden rounded-lg">
        <div className="pointer-events-none absolute top-0 left-1/2 w-[640px] origin-top -translate-x-1/2 scale-[.52]">
          <PracticeCertificate s={scores} bare />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
      </div>
      <Link href={`/dashboard/certificates?a=${attemptId}`} className="mt-auto inline-flex items-center gap-1.5 text-[14px] font-semibold text-gold-ink after:absolute after:inset-0 after:content-['']">
        View certificate <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </Card>
  );
}
