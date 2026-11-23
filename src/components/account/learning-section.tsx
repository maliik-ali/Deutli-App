"use client";

import { LanguageChips } from "@/components/language-chips";
import { setMyTimeZone } from "@/lib/account/actions";
import { getLanguage, MAX_LANGUAGES } from "@/lib/languages";
import { setMyLanguages } from "@/lib/practice/actions";
import { timeZoneLabel } from "@/lib/time";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section, SettingRow, FormButtons, timeZoneOptions } from "./account-ui";
import type { AccountState } from "./use-account-state";

/** Student: meaning languages and time zone. Staff (teachers, admins): only the time zone, since class times depend on it. */
export function LearningSection({ st, staff = false }: { st: AccountState; staff?: boolean }) {
  const {
    editing,
    busy,
    languages,
    setLanguages,
    draftLanguages,
    setDraftLanguages,
    timeZone,
    setTimeZone,
    draftTimeZone,
    setDraftTimeZone,
    open,
    close,
    submit,
    errorText,
  } = st;
  return (
    <>
      <Section title={staff ? "Time zone" : "Learning"} description={staff ? "Class times are shown in this time zone." : "Languages for word meanings, and your time zone."}>
        {!staff && (
          <SettingRow
            label="Meaning languages"
            value={
              <span className="grid gap-0.5">
                <span className="text-foreground">{languages.map((c) => getLanguage(c)?.name ?? c).join(", ")}</span>
                <span className="text-[13px]">Saved words are translated into these languages.</span>
              </span>
            }
            editing={editing === "languages"}
            onEdit={() => open("languages")}
            editLabel="Edit meaning languages"
          >
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit(async () => {
                  const r = await setMyLanguages(draftLanguages);
                  if ("languages" in r) setLanguages(r.languages);
                  return r;
                }, "Your languages are saved.");
              }}
            >
              <LanguageChips
                value={draftLanguages}
                onChange={setDraftLanguages}
                legend={`Pick up to ${MAX_LANGUAGES} languages`}
              />
              {errorText}
              <FormButtons busy={busy || draftLanguages.length === 0} onCancel={close} />
            </form>
          </SettingRow>
        )}

        <SettingRow
          label="Time zone"
          value={
            <span className="grid gap-0.5">
              <span className="text-foreground">{timeZoneLabel(timeZone)}</span>
              <span className="text-[13px]">Your day, streak, words due and dates use this time.</span>
            </span>
          }
          editing={editing === "timezone"}
          onEdit={() => open("timezone")}
          editLabel="Edit time zone"
        >
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit(async () => {
                const r = await setMyTimeZone(draftTimeZone);
                if ("ok" in r) setTimeZone(draftTimeZone);
                return r;
              }, "Your time zone is saved.");
            }}
          >
            <div className="grid gap-2">
              <label htmlFor="time-zone" className="text-sm font-semibold">
                Time zone
              </label>
              <Select value={draftTimeZone} onValueChange={setDraftTimeZone}>
                <SelectTrigger id="time-zone" className="sm:max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {timeZoneOptions(draftTimeZone).map((tz) => (
                    <SelectItem key={tz} value={tz} textValue={tz}>
                      {timeZoneLabel(tz)}
                      <span className="ml-2 text-[12px] text-subtle-foreground">{tz.split("/")[0]}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => setDraftTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)}
                className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-gold-ink underline-offset-4 hover:underline"
              >
                Use this device&apos;s time zone
              </button>
            </div>
            {errorText}
            <FormButtons busy={busy} onCancel={close} />
          </form>
        </SettingRow>
      </Section>
    </>
  );
}
