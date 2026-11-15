/**
 * Test for the writing check. Run:
 *   npm run test:writing              (needs an AI key in .env.local; ~20 calls cost a few cents)
 *   npm run test:writing -- --rules-only   (free: only the grammar checker, no AI)
 *
 * It checks (1) the built-in sample emails (weak / medium / strong) land in the expected score band,
 * (2) real student emails in real-emails.json (copy real-emails.example.json) against the teacher's score:
 * how far the AI is from the teacher, and whether it is too generous.
 */
import fs from "node:fs";
import path from "node:path";

import { aiReady } from "../../src/lib/ai/provider";
import { checkWriting } from "../../src/lib/writing/check";
import { checkGerman } from "../../src/lib/writing/languagetool";

type Sample = { id: string; level?: string; band?: [number, number]; teacher_total?: number; task?: string; email: string };
const dir = path.dirname(new URL(import.meta.url).pathname);
const load = (f: string): Sample[] => (fs.existsSync(path.join(dir, f)) ? JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) : []);
const pad = (s: string | number, n: number) => String(s).padEnd(n);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const samples = [...load("fixtures.json"), ...load("real-emails.json")];
  const rulesOnly = process.argv.includes("--rules-only");

  if (rulesOnly) {
    console.log("Grammar checker only (no AI)\n");
    for (const s of samples) {
      const r = await checkGerman(s.email);
      console.log(pad(s.id, 12), r === null ? "checker unreachable" : `${r.length} hint(s): ${r.map((m) => `${m.type}:"${s.email.slice(m.start, m.end)}"`).join(", ")}`);
      await wait(1500);
    }
    return;
  }
  if (!aiReady()) {
    console.log("No AI model configured. Put ANTHROPIC_API_KEY (or AI_PROVIDER=openai + AI_BASE_URL + AI_MODEL + AI_API_KEY) in .env.local.");
    process.exit(1);
  }

  let inBand = 0, banded = 0, generous = 0, failed = 0;
  const diffs: number[] = [];
  console.log(pad("email", 12), pad("level", 7), pad("AI", 5), pad("task/comm/acc", 15), pad("hints", 6), "result");
  for (const s of samples) {
    const r = await checkWriting(s.email, s.task ?? "");
    if (!r) {
      failed++;
      console.log(pad(s.id, 12), "AI failed");
      continue;
    }
    const c = r.criteria.map((x) => x.score).join("/");
    let verdict = "";
    if (s.band) {
      banded++;
      const ok = r.total >= s.band[0] && r.total <= s.band[1];
      if (ok) inBand++;
      verdict = ok ? `ok (expected ${s.band[0]}-${s.band[1]})` : `OUT OF BAND (expected ${s.band[0]}-${s.band[1]})`;
    }
    if (typeof s.teacher_total === "number") {
      const d = r.total - s.teacher_total;
      diffs.push(d);
      if (d > 5) generous++;
      verdict = `teacher ${s.teacher_total}, AI ${d >= 0 ? "+" : ""}${d}`;
    }
    console.log(pad(s.id, 12), pad(s.level ?? "real", 7), pad(r.total, 5), pad(c, 15), pad(r.mistakes.length, 6), verdict);
    await wait(1500);
  }
  console.log(`\nModel: ${process.env.AI_MODEL || (process.env.AI_PROVIDER === "openai" ? "?" : "claude-haiku-5-5")}`);
  if (banded) console.log(`Sample emails in the expected band: ${inBand} of ${banded}`);
  if (diffs.length) {
    const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const abs = diffs.reduce((a, b) => a + Math.abs(b), 0) / diffs.length;
    console.log(`Real emails: average AI minus teacher ${mean.toFixed(1)} points, average gap ${abs.toFixed(1)}, AI more than 5 points too generous: ${generous} of ${diffs.length}`);
  }
  if (failed) console.log(`AI failed on ${failed} email(s).`);
}
main();
