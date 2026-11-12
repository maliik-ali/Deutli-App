"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";

import { FormField } from "@/components/auth/form-field";
import { PasswordStrength } from "@/components/auth/password-strength";
import { LanguageChips } from "@/components/language-chips";
import { Button } from "@/components/ui/button";
import { changePassword, updateFullName, updatePhone, type AccountResult } from "@/lib/account/actions";
import { getLanguage, MAX_LANGUAGES, type LanguageCode } from "@/lib/languages";
import { setMyLanguages } from "@/lib/practice/actions";

type Row = "name" | "phone" | "password" | "languages";

export type AccountInfo = {
  fullName: string;
  email: string;
  phone: string;
  languages: LanguageCode[];
};

export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "S"
  );
}

/** One line of the account list: label, value, and an Edit button that opens a small form below. */
function SettingRow({
  label,
  value,
  editing,
  onEdit,
  editLabel,
  children,
}: {
  label: string;
  value: React.ReactNode;
  editing?: boolean;
  onEdit?: () => void;
  editLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-5 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:gap-x-6">
      <h2 className="text-[15px] font-semibold">{label}</h2>
      <div className="col-span-2 row-start-2 min-w-0 text-[15px] text-muted-foreground sm:col-span-1 sm:row-start-auto">
        {value}
      </div>
      {onEdit && !editing ? (
        <Button
          variant="ghost"
          size="sm"
          className="col-start-2 row-start-1 h-11 justify-self-end text-gold-ink sm:col-start-auto sm:row-start-auto sm:h-9"
          onClick={onEdit}
          aria-label={editLabel}
        >
          Edit
        </Button>
      ) : (
        <span className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto" aria-hidden />
      )}
      {editing && <div className="col-span-2 pt-3 sm:col-span-3">{children}</div>}
    </li>
  );
}

function FormButtons({ busy, onCancel, label = "Save" }: { busy: boolean; onCancel: () => void; label?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : label}
      </Button>
      <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
        Cancel
      </Button>
    </div>
  );
}

export function AccountSettings({ info }: { info: AccountInfo }) {
  const [editing, setEditing] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const [name, setName] = useState(info.fullName);
  const [phone, setPhone] = useState(info.phone);
  const [languages, setLanguages] = useState(info.languages);
  const [draftLanguages, setDraftLanguages] = useState(info.languages);
  const [newPassword, setNewPassword] = useState("");

  function open(row: Row) {
    setEditing(row);
    setError(null);
    setNotice(null);
    setDraftLanguages(languages);
    setNewPassword("");
  }
  function close() {
    setEditing(null);
    setError(null);
  }
  function submit(run: () => Promise<AccountResult | { error: string } | { languages: LanguageCode[] }>, done: string) {
    setError(null);
    startBusy(async () => {
      const result = await run();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEditing(null);
      setNotice(done);
    });
  }

  const errorText = error && (
    <p className="text-sm text-destructive" role="alert">
      {error}
    </p>
  );

  return (
    <div className="grid gap-4">
      {notice && (
        <p
          className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success"
          role="status"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden /> {notice}
        </p>
      )}
      <ul className="divide-y divide-border border-y border-border">
        <SettingRow
          label="Profile"
          value={
            <span className="flex items-center gap-3">
              <span
                className="grid size-11 shrink-0 place-items-center rounded-full bg-gold-soft font-heading text-[15px] font-bold text-gold-ink"
                aria-hidden
              >
                {initialsOf(name)}
              </span>
              <span className="truncate font-medium text-foreground">{name || "No name yet"}</span>
            </span>
          }
          editing={editing === "name"}
          onEdit={() => open("name")}
          editLabel="Edit name"
        >
          <form
            className="grid max-w-md gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const value = String(new FormData(e.currentTarget).get("fullName") ?? "");
              submit(async () => {
                const r = await updateFullName(value);
                if ("ok" in r) setName(value.trim());
                return r;
              }, "Your name is saved.");
            }}
          >
            <FormField
              id="fullName"
              name="fullName"
              label="Full name"
              defaultValue={name}
              autoComplete="name"
              required
            />
            {errorText}
            <FormButtons busy={busy} onCancel={close} />
          </form>
        </SettingRow>

        <SettingRow
          label="Email"
          value={
            <span className="grid gap-0.5">
              <span className="break-all text-foreground">{info.email}</span>
              <span className="text-[13px]">To change your email, ask your academy.</span>
            </span>
          }
        />

        <SettingRow
          label="Phone"
          value={phone ? <span className="text-foreground">{phone}</span> : "No number added"}
          editing={editing === "phone"}
          onEdit={() => open("phone")}
          editLabel="Edit phone number"
        >
          <form
            className="grid max-w-md gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const value = String(new FormData(e.currentTarget).get("phone") ?? "");
              submit(async () => {
                const r = await updatePhone(value);
                if ("ok" in r) setPhone(value.trim());
                return r;
              }, "Your phone number is saved.");
            }}
          >
            <FormField
              id="phone"
              name="phone"
              type="tel"
              label="Phone number"
              optional
              defaultValue={phone}
              autoComplete="tel"
              placeholder="+92 300 1234567"
            />
            {errorText}
            <FormButtons busy={busy} onCancel={close} />
          </form>
        </SettingRow>

        <SettingRow
          label="Password"
          value={<span aria-label="Password hidden">••••••••</span>}
          editing={editing === "password"}
          onEdit={() => open("password")}
          editLabel="Change password"
        >
          <form
            className="grid max-w-md gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const input = {
                currentPassword: String(f.get("currentPassword") ?? ""),
                password: String(f.get("password") ?? ""),
                confirmPassword: String(f.get("confirmPassword") ?? ""),
              };
              submit(() => changePassword(input), "Your password is changed.");
            }}
          >
            <FormField
              id="currentPassword"
              name="currentPassword"
              type="password"
              label="Current password"
              autoComplete="current-password"
              required
            />
            <FormField
              id="password"
              name="password"
              type="password"
              label="New password"
              autoComplete="new-password"
              hint={<PasswordStrength password={newPassword} />}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <FormField
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label="Type the new password again"
              autoComplete="new-password"
              required
            />
            {errorText}
            <FormButtons busy={busy} onCancel={close} label="Change password" />
          </form>
        </SettingRow>

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

        <SettingRow
          label="Time zone"
          value={
            <span className="grid gap-0.5">
              <span className="text-foreground">Pakistan time (PKT, GMT+5)</span>
              <span className="text-[13px]">Classes, exams and your streak use this time.</span>
            </span>
          }
        />
      </ul>
    </div>
  );
}
