"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Languages, Loader2, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getLanguage, LANGUAGES, MAX_LANGUAGES, textProps, type LanguageCode } from "@/lib/languages";
import {
  removeVocabularyWord,
  setMyLanguages,
  setVocabularyMeaning,
  translateVocabularyWord,
} from "@/lib/practice/actions";
import type { SavedWord } from "@/lib/practice/plan";
import { cn } from "@/lib/utils";

/** Rough height of the box, used to place it above or below the word. */
export function wordBoxHeight(languageCount: number) {
  return 200 + languageCount * 80;
}

/**
 * Box for a saved word: meanings in the student's languages (filled in
 * automatically, editable), the languages they want, and Remove.
 */
export function WordBox({
  word,
  languages,
  style,
  onClose,
  onUpdate,
  onRemoved,
  onLanguagesChange,
}: {
  word: SavedWord;
  languages: LanguageCode[];
  style: React.CSSProperties;
  onClose: () => void;
  onUpdate: (word: SavedWord) => void;
  onRemoved: (id: string) => void;
  onLanguagesChange: (languages: LanguageCode[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const [translating, setTranslating] = useState(false);
  const [picking, setPicking] = useState(false);
  const [draftLanguages, setDraftLanguages] = useState<LanguageCode[]>(languages);
  const tried = useRef(new Set<string>());

  // Translate automatically when a language has no meaning yet (once per word + languages).
  const missing = languages.filter((code) => !word.translations[code]);
  const missingKey = `${word.id}:${missing.join(",")}`;
  useEffect(() => {
    if (missing.length === 0 || tried.current.has(missingKey)) return;
    tried.current.add(missingKey);
    let cancelled = false;
    setTranslating(true);
    setError(null);
    translateVocabularyWord(word.id)
      .then((result) => {
        if (cancelled) return;
        if ("error" in result) setError(result.error);
        else onUpdate(result.word);
      })
      .catch(
        () => !cancelled && setError("We couldn't translate this word right now. You can type the meaning yourself."),
      )
      .finally(() => !cancelled && setTranslating(false));
    return () => {
      cancelled = true;
    };
    // missingKey covers the word and the missing languages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey]);

  function save(form: FormData) {
    const meanings = Object.fromEntries(languages.map((code) => [code, String(form.get(`meaning-${code}`) ?? "")]));
    setError(null);
    startBusy(async () => {
      const result = await setVocabularyMeaning(word.id, meanings);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onUpdate({ ...word, translations: result.translations });
      onClose();
    });
  }

  function remove() {
    setError(null);
    startBusy(async () => {
      const result = await removeVocabularyWord(word.id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onRemoved(word.id);
    });
  }

  function saveLanguages() {
    setError(null);
    startBusy(async () => {
      const result = await setMyLanguages(draftLanguages);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onLanguagesChange(result.languages);
      setPicking(false);
    });
  }

  function toggleDraft(code: LanguageCode) {
    setDraftLanguages((list) =>
      list.includes(code) ? list.filter((c) => c !== code) : list.length < MAX_LANGUAGES ? [...list, code] : list,
    );
  }

  const showForm = word.dictionaryForm && word.dictionaryForm.toLowerCase() !== word.word.toLowerCase();

  return (
    <form
      data-word-box
      aria-label={`Saved word ${word.word}`}
      style={style}
      className="fixed z-40 grid max-h-[calc(100dvh-24px)] w-[300px] gap-3 overflow-y-auto rounded-2xl border border-border bg-ink p-4 shadow-lg shadow-black/40"
      onSubmit={(e) => {
        e.preventDefault();
        save(new FormData(e.currentTarget));
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-success">
            <Check className="size-3.5" aria-hidden /> Saved to your vocabulary
          </p>
          <p className="truncate font-heading text-lg font-bold" lang="de">
            {word.word}
          </p>
          {showForm && (
            <p className="truncate text-[13px] text-muted-foreground" lang="de">
              Dictionary form: <span className="font-semibold text-foreground">{word.dictionaryForm}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-m-2 grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {picking ? (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-[13px] font-medium text-muted-foreground">
            Show meanings in (up to {MAX_LANGUAGES})
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((l) => {
              const on = draftLanguages.includes(l.code);
              const full = !on && draftLanguages.length >= MAX_LANGUAGES;
              return (
                <button
                  key={l.code}
                  type="button"
                  aria-pressed={on}
                  disabled={full}
                  onClick={() => toggleDraft(l.code)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1 rounded-full border px-3 text-[13px] font-medium transition-colors disabled:opacity-40",
                    on
                      ? "border-gold-ink bg-gold/30 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {on && <Check className="size-3.5" aria-hidden />}
                  {l.name}
                </button>
              );
            })}
          </div>
          <div className="mt-1 flex gap-2">
            <Button type="button" size="sm" onClick={saveLanguages} disabled={busy || draftLanguages.length === 0}>
              {busy ? "Saving…" : "Use these"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraftLanguages(languages);
                setPicking(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </fieldset>
      ) : (
        <>
          {languages.map((code) => {
            const lang = getLanguage(code);
            const props = textProps(code);
            const value = word.translations[code] ?? "";
            return (
              <div key={code} className="grid gap-1.5">
                <label htmlFor={`meaning-${code}`} className="text-[13px] font-medium text-muted-foreground">
                  {lang?.name ?? code}
                </label>
                <input
                  // Re-create the field when an automatic translation arrives.
                  key={`${word.id}-${code}-${value}`}
                  id={`meaning-${code}`}
                  name={`meaning-${code}`}
                  lang={props.lang}
                  dir={props.dir}
                  defaultValue={value}
                  maxLength={200}
                  autoComplete="off"
                  disabled={translating && !value}
                  placeholder={translating && !value ? "Translating…" : `Meaning in ${lang?.name ?? code}`}
                  className={cn(
                    "h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px] outline-none placeholder:text-muted-foreground/70 focus-visible:border-gold-ink disabled:opacity-70",
                    props.dir === "rtl" && "text-right",
                    props.className,
                    code === "ur" && "h-12 text-[17px] leading-normal",
                  )}
                />
              </div>
            );
          })}
          <p className="flex items-center gap-2 text-[12px] text-muted-foreground">
            {translating ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden /> Translating automatically…
              </>
            ) : (
              <>
                <Languages className="size-3.5 shrink-0" aria-hidden />
                <span>
                  {missing.length ? "Type the meaning yourself." : "Translated automatically. You can correct it."}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDraftLanguages(languages);
                    setPicking(true);
                  }}
                  className="ml-auto shrink-0 font-semibold text-gold-ink underline-offset-4 hover:underline"
                >
                  Languages
                </button>
              </>
            )}
          </p>
        </>
      )}

      {error && (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      )}

      {!picking && (
        <div className="flex items-center justify-between gap-2">
          <Button type="submit" size="sm" disabled={busy || translating}>
            {busy ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={busy}
            onClick={remove}
          >
            <Trash2 aria-hidden /> Remove
          </Button>
        </div>
      )}
    </form>
  );
}
