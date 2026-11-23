"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { importDictionarySheet, type ImportResult } from "@/lib/dictionary/actions";
import { OptionSelect } from "@/components/ui/option-select";

const MAX_BYTES = 1_800_000;

/** Pick a CSV file and upload it into the shared word dictionary. */
export function DictionaryUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, startBusy] = useTransition();
  const [level, setLevel] = useState("");
  const [topic, setTopic] = useState("");

  function upload() {
    if (!file) return;
    setResult(null);
    if (!/\.csv$/i.test(file.name)) {
      setResult({ error: "Please choose a .csv file. In Excel or Google Sheets: File → Download / Save as → CSV." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setResult({ error: "The file is too big. Split it into smaller files (max 5,000 words each)." });
      return;
    }
    startBusy(async () => {
      try {
        const text = await file.text();
        setResult(await importDictionarySheet(text, { level: level || undefined, topic: topic.trim() || undefined }));
      } catch {
        setResult({ error: "The upload didn't finish. Check your internet and try again." });
      }
    });
  }

  return (
    <div className="grid gap-4">
      <label
        htmlFor="dictionary-file"
        className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-center transition-colors hover:bg-muted focus-within:border-gold-ink"
      >
        <FileSpreadsheet className="size-7 text-gold-ink" aria-hidden />
        <span className="text-[15px] font-semibold">{file ? file.name : "Choose a CSV file"}</span>
        <span className="text-[13px] text-muted-foreground">
          {file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "From Excel or Google Sheets, saved as CSV"}
        </span>
        <input
          ref={inputRef}
          id="dictionary-file"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
          }}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="dictionary-level" className="text-sm font-semibold">
            Also add to a level list
          </label>
          <OptionSelect
            id="dictionary-level"
            value={level || "none"}
            onChange={(v) => setLevel(v === "none" ? "" : v)}
            options={[
              { value: "none", label: "No, only the dictionary" },
              { value: "a1", label: "A1 vocabulary" },
              { value: "a2", label: "A2 vocabulary" },
              { value: "b1", label: "B1 vocabulary" },
            ]}
          />
          <p className="text-[13px] text-muted-foreground">
            Students learn level lists on the Vocabulary page. A &quot;level&quot; column in the sheet works too.
          </p>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="dictionary-topic" className="text-sm font-semibold">
            Topic (optional)
          </label>
          <input
            id="dictionary-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={80}
            disabled={!level}
            placeholder="e.g. Kapitel 1 · Hallo"
            className="h-11 rounded-xl border border-input bg-card px-3 text-[15px] outline-none placeholder:text-muted-foreground/70 focus-visible:border-gold-ink disabled:opacity-50"
          />
          <p className="text-[13px] text-muted-foreground">
            Used when the sheet has no &quot;topic&quot; column. Words without a topic are grouped in sets of 50.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={upload} disabled={!file || busy}>
          <Upload aria-hidden /> {busy ? "Uploading…" : "Upload words"}
        </Button>
        <a
          href="/templates/word-dictionary-template.csv"
          download
          className="inline-flex h-11 items-center text-sm font-semibold text-gold-ink underline-offset-4 hover:underline"
        >
          Download the template
        </a>
      </div>

      {result && "error" in result && (
        <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
          {result.error}
        </p>
      )}
      {result && !("error" in result) && (
        <div className="grid gap-3 rounded-xl border border-border p-4" role="status">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-5 text-success" aria-hidden />
            {result.added + result.updated === 0
              ? "No words were saved."
              : `${result.added} new ${result.added === 1 ? "word" : "words"} added, ${result.updated} updated.`}
            {result.levelWords > 0 && ` ${result.levelWords} words are in the level list.`}
          </p>
          {result.problems.length > 0 && (
            <div className="grid gap-1.5">
              <p className="text-sm text-muted-foreground">
                {result.problems.length} {result.problems.length === 1 ? "row was" : "rows were"} skipped. Fix them in
                the sheet and upload again:
              </p>
              <ul className="grid max-h-48 gap-1 overflow-y-auto text-sm">
                {result.problems.slice(0, 50).map((p) => (
                  <li key={`${p.line}-${p.reason}`}>
                    <span className="font-semibold">Row {p.line}:</span> {p.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
