"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { importVerbsSheet, type VerbImportResult } from "@/lib/verbs/actions";

const MAX_BYTES = 1_800_000;

/** Pick the verbs CSV and upload it. The same verb and meaning uploaded again is updated. */
export function VerbsUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<VerbImportResult | null>(null);
  const [busy, startBusy] = useTransition();

  function upload() {
    if (!file) return;
    setResult(null);
    if (!/\.csv$/i.test(file.name)) return setResult({ error: "Please choose a .csv file." });
    if (file.size > MAX_BYTES) return setResult({ error: "The file is too big. Split it into smaller files." });
    startBusy(async () => {
      try {
        setResult(await importVerbsSheet(await file.text()));
      } catch {
        setResult({ error: "The upload didn't finish. Check your internet and try again." });
      }
    });
  }

  return (
    <div className="grid gap-4">
      <label htmlFor="verbs-file" className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-5 text-center transition-colors hover:bg-muted focus-within:border-gold-ink">
        <FileSpreadsheet className="size-6 text-gold-ink" aria-hidden />
        <span className="text-[15px] font-semibold">{file ? file.name : "Choose the verbs CSV"}</span>
        <span className="text-[13px] text-muted-foreground">{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "From Excel or Google Sheets, saved as CSV"}</span>
        <input id="verbs-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }} />
      </label>
      <div>
        <Button onClick={upload} disabled={!file || busy}>
          <Upload aria-hidden /> {busy ? "Uploading…" : "Upload verbs"}
        </Button>
      </div>
      {result && "error" in result && <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">{result.error}</p>}
      {result && !("error" in result) && (
        <div className="grid gap-3 rounded-xl border border-border p-4" role="status">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-5 text-success" aria-hidden />
            {result.added + result.updated === 0 ? "No verbs were saved." : `${result.added} new ${result.added === 1 ? "verb" : "verbs"} added, ${result.updated} updated.`}
          </p>
          {result.problems.length > 0 && (
            <div className="grid gap-1.5">
              <p className="text-sm text-muted-foreground">{result.problems.length} {result.problems.length === 1 ? "row was" : "rows were"} skipped:</p>
              <ul className="grid max-h-48 gap-1 overflow-y-auto text-sm">
                {result.problems.slice(0, 50).map((p) => <li key={`${p.line}-${p.reason}`}><span className="font-semibold">Row {p.line}:</span> {p.reason}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
