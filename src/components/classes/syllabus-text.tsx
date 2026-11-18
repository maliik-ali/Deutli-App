/**
 * Shows a teacher's plain-text syllabus nicely: lines starting with "- " or "• " become a list,
 * "## " lines become small headings, blank lines separate paragraphs.
 */
export function SyllabusText({ text }: { text: string }) {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim() !== ""))
    .filter((b) => b.length > 0);

  return (
    <div className="grid gap-4 text-[15px] leading-relaxed text-muted-foreground">
      {blocks.map((lines, i) => {
        const items: string[] = [];
        const out: React.ReactNode[] = [];
        const flush = () => {
          if (items.length === 0) return;
          out.push(
            <ul key={`ul-${out.length}`} className="grid list-disc gap-1.5 pl-5 marker:text-gold-ink">
              {items.splice(0).map((t, j) => (
                <li key={j} className="text-foreground">
                  {t}
                </li>
              ))}
            </ul>,
          );
        };
        for (const line of lines) {
          const bullet = /^\s*(?:[-•*])\s+(.*)$/.exec(line);
          const heading = /^##\s+(.*)$/.exec(line);
          if (bullet) items.push(bullet[1]);
          else {
            flush();
            out.push(
              heading ? (
                <h3 key={`h-${out.length}`} className="text-[16px] font-bold text-foreground">
                  {heading[1]}
                </h3>
              ) : (
                <p key={`p-${out.length}`}>{line}</p>
              ),
            );
          }
        }
        flush();
        return (
          <div key={i} className="grid gap-2">
            {out}
          </div>
        );
      })}
    </div>
  );
}
