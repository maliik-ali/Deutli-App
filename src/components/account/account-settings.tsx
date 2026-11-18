"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, CheckCircle2 } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { FormField } from "@/components/auth/form-field";
import { PasswordStrength } from "@/components/auth/password-strength";
import { GoogleMark } from "@/components/auth/social-buttons";
import { LanguageChips } from "@/components/language-chips";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  changePassword,
  deleteMyAccount,
  removeAvatar,
  setMyTimeZone,
  updateFullName,
  updatePhone,
  uploadAvatar,
  type AccountResult,
} from "@/lib/account/actions";
import { getLanguage, MAX_LANGUAGES, type LanguageCode } from "@/lib/languages";
import { setMyLanguages } from "@/lib/practice/actions";
import { timeZoneLabel } from "@/lib/time";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = "photo" | "name" | "phone" | "password" | "languages" | "timezone" | "delete";

export type AccountInfo = {
  fullName: string;
  email: string;
  phone: string;
  languages: LanguageCode[];
  avatarUrl: string | null;
  /** IANA time zone, e.g. "Europe/Berlin". */
  timeZone: string;
  /** How this person can log in. */
  signIn: {
    /** The connected Google account (from Google's sign-in details), or null. */
    google: { name: string | null; email: string | null; avatarUrl: string | null } | null;
    password: boolean;
  };
  /** Only students can delete their own account; staff accounts are removed by an admin. */
  canDelete: boolean;
};

const LEGAL_LINKS = [
  { label: "Terms", href: "https://www.deutli.com/terms" },
  { label: "Privacy", href: "https://www.deutli.com/privacy" },
  { label: "Impressum", href: "https://www.deutli.com/impressum" },
];

const PHOTO_SIZE = 256;

/** All time zones the browser knows, with the current one always included. */
function timeZoneOptions(current: string): string[] {
  let list: string[] = [];
  try {
    list = (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
  } catch {
    list = [];
  }
  return list.includes(current) ? list : [current, ...list];
}

/** Crops the picked image to a centred square and shrinks it to 256×256 JPEG (about 20–40 KB). */
async function squarePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    PHOTO_SIZE,
    PHOTO_SIZE,
  );
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("no blob");
  return blob;
}

/** A group of settings in a dashboard-style card. */
function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="gap-1 pb-2">
      <div className="grid gap-1">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      <ul className="divide-y divide-border">{children}</ul>
    </Card>
  );
}

/** One line in a card: label, value, and an Edit button that opens a small form below. */
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
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:gap-x-6">
      <h3 className="text-[15px] font-semibold">{label}</h3>
      <div className="col-span-2 row-start-2 min-w-0 text-[15px] text-muted-foreground sm:col-span-1 sm:row-start-auto">
        {value}
      </div>
      {onEdit && !editing ? (
        <Button
          variant="outline"
          size="sm"
          className="col-start-2 row-start-1 h-11 justify-self-end sm:col-start-auto sm:row-start-auto sm:h-9"
          onClick={onEdit}
          aria-label={editLabel}
        >
          Edit
        </Button>
      ) : (
        <span className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto" aria-hidden />
      )}
      {editing && <div className="col-span-2 pt-3 pb-2 sm:col-span-3">{children}</div>}
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
  const [timeZone, setTimeZone] = useState(info.timeZone);
  const [draftTimeZone, setDraftTimeZone] = useState(info.timeZone);
  const [avatarUrl, setAvatarUrl] = useState(info.avatarUrl);
  const [confirmText, setConfirmText] = useState("");
  // Offer the Google name with one tap when it differs from the saved name.
  const googleName =
    info.signIn.google?.name && info.signIn.google.name.toLowerCase() !== name.trim().toLowerCase()
      ? info.signIn.google.name
      : null;
  const [photo, setPhoto] = useState<{ blob: Blob; preview: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function open(row: Row) {
    setEditing(row);
    setError(null);
    setNotice(null);
    setDraftLanguages(languages);
    setDraftTimeZone(timeZone);
    setNewPassword("");
  }
  function close() {
    setEditing(null);
    setError(null);
    if (photo) URL.revokeObjectURL(photo.preview);
    setPhoto(null);
  }
  function submit(run: () => Promise<AccountResult | { error: string } | object>, done: string) {
    setError(null);
    startBusy(async () => {
      const result = await run();
      if ("error" in result) {
        setError(result.error as string);
        return;
      }
      setEditing(null);
      setNotice(done);
    });
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);
    if (!file.type.startsWith("image/")) {
      setEditing("photo");
      setError("Please choose a photo (JPG, PNG or WebP).");
      return;
    }
    try {
      const blob = await squarePhoto(file);
      if (photo) URL.revokeObjectURL(photo.preview);
      setPhoto({ blob, preview: URL.createObjectURL(blob) });
      setEditing("photo");
    } catch {
      setEditing("photo");
      setError("We couldn't open that photo. Try a JPG or PNG.");
    }
  }

  function savePhoto() {
    if (!photo) return;
    const form = new FormData();
    form.append("photo", photo.blob, "photo.jpg");
    submit(async () => {
      const r = await uploadAvatar(form);
      if ("url" in r) {
        setAvatarUrl(r.url || photo.preview);
        setPhoto(null);
      }
      return r;
    }, "Your photo is saved.");
  }

  const errorText = error && (
    <p className="text-sm text-destructive" role="alert">
      {error}
    </p>
  );

  return (
    <div className="grid gap-6">
      {notice && (
        <p
          className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success"
          role="status"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden /> {notice}
        </p>
      )}

      <Section title="Profile" description="How you appear to your teachers and classmates.">
        <SettingRow
          label="Photo"
          value={
            <span className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group relative rounded-full focus-visible:outline-2"
                aria-label={avatarUrl ? "Change photo" : "Add a photo"}
              >
                <Avatar name={name} url={photo?.preview ?? avatarUrl} className="size-16 text-xl" />
                <span className="absolute -right-0.5 -bottom-0.5 grid size-7 place-items-center rounded-full border-2 border-card bg-gold text-white transition-transform group-hover:scale-110">
                  <Camera className="size-3.5" aria-hidden />
                </span>
              </button>
              <span className="text-[13px]">
                {avatarUrl ? "Tap the photo to change it." : "Add a photo so your teacher can recognise you."}
              </span>
            </span>
          }
          editing={editing === "photo"}
          onEdit={avatarUrl ? () => open("photo") : undefined}
          editLabel="Edit photo"
        >
          <div className="grid gap-4">
            {photo ? (
              <p className="text-sm text-muted-foreground">This is how your new photo will look.</p>
            ) : (
              avatarUrl && <p className="text-sm text-muted-foreground">Change or remove your photo.</p>
            )}
            {errorText}
            <div className="flex flex-wrap gap-2">
              {photo ? (
                <Button onClick={savePhoto} disabled={busy}>
                  {busy ? "Saving…" : "Save photo"}
                </Button>
              ) : (
                <Button onClick={() => fileRef.current?.click()} disabled={busy}>
                  Choose a photo
                </Button>
              )}
              {!photo && avatarUrl && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    submit(async () => {
                      const r = await removeAvatar();
                      if ("ok" in r) setAvatarUrl(null);
                      return r;
                    }, "Your photo is removed.")
                  }
                >
                  Remove photo
                </Button>
              )}
              <Button variant="ghost" onClick={close} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        </SettingRow>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            void pickPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <SettingRow
          label="Name"
          value={
            <span className="grid justify-items-start gap-0.5">
              <span className="text-foreground">{name || "No name yet"}</span>
              {googleName && editing !== "name" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    submit(async () => {
                      const r = await updateFullName(googleName);
                      if ("ok" in r) setName(googleName);
                      return r;
                    }, "Your name is saved.")
                  }
                  className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-gold-ink underline-offset-4 hover:underline disabled:opacity-60 sm:min-h-8"
                >
                  <span className="[&_svg]:size-3.5" aria-hidden>
                    <GoogleMark />
                  </span>
                  Use &ldquo;{googleName}&rdquo; from Google
                </button>
              )}
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
      </Section>

      <Section title="Sign-in and contact" description="Your email, phone number and password.">
        <SettingRow
          label="Email"
          value={
            <span className="grid gap-0.5">
              <span className="break-all text-foreground">{info.email}</span>
              <span className="text-[13px]">To change your email, ask your academy.</span>
            </span>
          }
        />

        {info.signIn.google && (
          <SettingRow
            label="Google"
            value={
              <span className="flex items-center gap-3">
                <span className="relative shrink-0">
                  <Avatar
                    name={info.signIn.google.name ?? name}
                    url={info.signIn.google.avatarUrl}
                    className="size-11 text-[15px]"
                  />
                  <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full border-2 border-card bg-white [&_svg]:size-3">
                    <GoogleMark />
                  </span>
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate font-semibold text-foreground">
                      {info.signIn.google.name ?? "Google account"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-[12px] font-semibold text-success">
                      <CheckCircle2 className="size-3.5" aria-hidden /> Connected
                    </span>
                  </span>
                  {info.signIn.google.email &&
                    info.signIn.google.email.toLowerCase() !== info.email.toLowerCase() && (
                    <span className="truncate text-[13px]">{info.signIn.google.email}</span>
                  )}
                </span>
              </span>
            }
          />
        )}

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
          value={
            info.signIn.password ? (
              <span aria-label="Password hidden">••••••••</span>
            ) : (
              "No password set. You log in with Google."
            )
          }
          editing={editing === "password"}
          onEdit={info.signIn.password ? () => open("password") : undefined}
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
      </Section>

      <Section title="Learning" description="Languages for word meanings, and your time zone.">
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

      {info.canDelete && (
        <form
          aria-labelledby="delete-account-title"
          className="overflow-hidden rounded-2xl border border-destructive/40 bg-card"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startBusy(async () => {
              const r = await deleteMyAccount(confirmText);
              if (r && "error" in r) setError(r.error);
            });
          }}
        >
          <div className="grid gap-5 p-6">
            <div className="grid gap-1">
              <CardTitle id="delete-account-title" className="text-lg">
                Delete account
              </CardTitle>
              <CardDescription>
                Permanently delete your Deutli account with your profile, progress, saved words and exam results.
              </CardDescription>
            </div>
            {editing === "delete" && (
              <div className="grid max-w-md gap-4 border-t border-border pt-5">
                <p className="text-sm text-muted-foreground">
                  You&apos;ll be logged out and can&apos;t get your data back. Payment records are kept without your
                  name, because the law requires it.
                </p>
                <FormField
                  id="confirmDelete"
                  name="confirmDelete"
                  label="Type DELETE to confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  autoFocus
                  required
                />
                {errorText}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-destructive/30 bg-destructive-soft/60 px-6 py-4">
            {editing === "delete" ? (
              <>
                <Button type="button" variant="ghost" onClick={close} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="ink"
                  disabled={busy || confirmText.trim().toUpperCase() !== "DELETE"}
                  className="bg-destructive font-semibold text-background hover:bg-destructive/90"
                >
                  {busy ? "Deleting…" : "Delete my account"}
                </Button>
              </>
            ) : (
              <>
                <p className="mr-auto text-[13px] text-muted-foreground">This can&apos;t be undone.</p>
                <Button
                  type="button"
                  variant="ink"
                  onClick={() => {
                    setConfirmText("");
                    open("delete");
                  }}
                  className="bg-destructive font-semibold text-background hover:bg-destructive/90"
                >
                  Delete account
                </Button>
              </>
            )}
          </div>
        </form>
      )}

      <nav aria-label="Legal" className="flex flex-wrap gap-x-5 px-1 text-[13px] text-subtle-foreground">
        {LEGAL_LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
          >
            {l.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
