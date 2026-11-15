/**
 * Splits text so saved words end up at odd positions: [text, word, text, word, …].
 * Works without regex "lookbehind", which older iPhones (iOS 16.3 and below) cannot run
 * and which crashed the Daily Practice page there.
 */
export function splitSavedWords(text: string, words: string[]): string[] {
  if (!words.length) return [text];
  const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const alternatives = [...words].sort((a, b) => b.length - a.length).map(escape).join("|");
  // Group 1 = the character before the word (or start of text), group 2 = the word itself.
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${alternatives})(?![\\p{L}\\p{N}])`, "giu");
  const out: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = m.index + m[1].length;
    out.push(text.slice(last, start), m[2]);
    last = start + m[2].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  out.push(text.slice(last));
  return out;
}
