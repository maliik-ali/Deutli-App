import Image from "next/image";

export type CertScores = {
  name: string;
  examTitle: string;
  date: string;
  lesen: { got: number; max: number };
  sprach: { got: number; max: number };
  hoeren: { got: number; max: number };
  /** null = not marked yet */
  writing: number | null;
  writingBy: "teacher" | "ai" | null;
};

const num = (n: number | null) => (n == null ? "–" : n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

/** What the Prädikat would be if the oral exam (75 points) matched the written percentage. */
export function projectedPrädikat(written: number) {
  const p = (written / 225) * 300;
  if (p >= 270) return "Sehr gut";
  if (p >= 225) return "Gut";
  if (p >= 180) return "Befriedigend";
  if (p >= 135) return "Ausreichend";
  return "Nicht bestanden";
}

function Row({ label, got, max, sub }: { label: string; got: number | null; max: number; sub?: boolean }) {
  return (
    <div className={sub ? "grid grid-cols-[1fr_auto_auto] items-baseline gap-2 pl-4 text-[13px] sm:text-[14px]" : "grid grid-cols-[1fr_auto_auto] items-baseline gap-2 font-semibold"}>
      <span className="flex items-center gap-2">
        {sub && <span className="size-1.5 rounded-full bg-neutral-400" aria-hidden />}
        {label}
      </span>
      <span className="min-w-14 border-b border-neutral-400 text-right tabular-nums">{num(got)}</span>
      <span className="w-20 text-neutral-600">/ {max} Punkte</span>
    </div>
  );
}

/**
 * A sample of what a telc B1 certificate looks like, filled with the student's practice scores.
 * It is clearly marked as a practice sample: no telc logo, QR code, stamp or signature.
 */
export function PracticeCertificate({ s }: { s: CertScores }) {
  const written = s.lesen.got + s.sprach.got + s.hoeren.got + (s.writing ?? 0);
  const complete = s.writing != null;
  return (
    <figure className="grid gap-3">
      <div className="relative mx-auto w-full max-w-[640px] overflow-hidden rounded-md bg-[#fbfaf7] p-6 text-neutral-900 shadow-2xl shadow-black/50 sm:p-10" style={{ aspectRatio: "auto" }}>
        <div aria-hidden className="pointer-events-none absolute inset-3 rounded border border-neutral-300" />
        <div aria-hidden className="pointer-events-none absolute top-6 -right-14 rotate-[35deg] bg-[#7f25fb] px-14 py-1 text-[10px] font-bold tracking-[0.2em] text-white uppercase">
          Sample
        </div>
        <div className="relative grid gap-5">
          <div className="flex items-center gap-2">
            <Image src="/deutli-owl.png" alt="" width={32} height={32} className="size-8" />
            <span className="text-lg font-extrabold tracking-tight">Deutli</span>
            <span className="ml-1 text-[10px] font-semibold tracking-[0.18em] text-neutral-500 uppercase">Practice certificate</span>
          </div>

          <h3 className="text-[40px] leading-none font-light tracking-tight sm:text-[54px]">Zertifikat</h3>
          <div>
            <p className="text-lg font-bold">Deutsch B1</p>
            <p className="text-[12px] text-neutral-600">Europäischer Referenzrahmen B1 · {s.examTitle}</p>
          </div>

          <div className="grid gap-1">
            <p className="border-b border-neutral-400 pb-0.5 text-base font-semibold">{s.name}</p>
            <p className="text-[11px] text-neutral-500">Name · Vorname</p>
          </div>

          <div className="grid gap-1.5 text-[14px]">
            <Row label="Schriftliche Prüfung" got={written} max={225} />
            <Row sub label="Leseverstehen" got={s.lesen.got} max={s.lesen.max} />
            <Row sub label="Sprachbausteine" got={s.sprach.got} max={s.sprach.max} />
            <Row sub label="Hörverstehen" got={s.hoeren.got} max={s.hoeren.max} />
            <Row sub label="Schriftlicher Ausdruck" got={s.writing} max={45} />
            <div className="mt-2 text-neutral-500">
              <Row label="Mündliche Prüfung" got={null} max={75} />
            </div>
            <p className="pl-4 text-[12px] text-neutral-500">Speaking is not part of the online mock. Practise it with your teacher.</p>
          </div>

          <div className="grid gap-1 border-t border-neutral-300 pt-3 text-[14px]">
            <div className="grid grid-cols-[1fr_auto] items-baseline gap-2">
              <span className="font-semibold">Prädikat</span>
              <span className="font-bold">{complete ? projectedPrädikat(written) : "–"}</span>
            </div>
            <p className="text-[11.5px] text-neutral-500">
              {complete ? "A projection: this is your Prädikat if your speaking result matches your written percentage." : "Appears once your writing is marked."}
            </p>
            {s.writingBy && <p className="text-[11.5px] text-neutral-500">Writing score: {s.writingBy === "teacher" ? "marked by your teacher" : "AI estimate"}.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-neutral-300 pt-3 text-[12px] text-neutral-600">
            <p>
              <span className="block text-neutral-400">Datum der Prüfung</span>
              {s.date}
            </p>
            <p className="text-right">
              <span className="block text-neutral-400">Ausgestellt von</span>
              Deutli practice
            </p>
          </div>
          <p className="text-center text-[10.5px] text-neutral-400">A Deutli practice sample, not an official telc certificate.</p>
        </div>
      </div>
      <figcaption className="text-center text-[13px] text-muted-foreground">This is how your result looks on a real certificate. Keep going and yours will carry your name too.</figcaption>
    </figure>
  );
}
