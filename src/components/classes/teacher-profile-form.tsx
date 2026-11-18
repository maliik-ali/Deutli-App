"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, CheckCircle2 } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { LanguageChips } from "@/components/language-chips";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { removeAvatar, uploadAvatar } from "@/lib/account/actions";
import { squarePhoto } from "@/lib/account/photo-crop";
import { saveTeacherProfile } from "@/lib/classes/actions";
import { SPECIALTIES } from "@/lib/classes/constants";
import { cleanLanguages, type LanguageCode } from "@/lib/languages";
import { cn } from "@/lib/utils";

export type TeacherProfileValues = {
  name: string;
  avatarUrl: string | null;
  headline: string;
  bio: string;
  specialties: string[];
  speaks: string[];
  isPublic: boolean;
};

/** The teacher's own profile: photo, one-line headline, bio, what they teach, languages they explain in. */
export function TeacherProfileForm({ initial }: { initial: TeacherProfileValues }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [speaks, setSpeaks] = useState<LanguageCode[]>(() => (initial.speaks.length ? cleanLanguages(initial.speaks) : []));
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, startBusy] = useTransition();
  const [photoBusy, startPhoto] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError(null);
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose a photo (JPG, PNG or WebP).");
      return;
    }
    startPhoto(async () => {
      try {
        const blob = await squarePhoto(file);
        const form = new FormData();
        form.append("photo", blob, "photo.jpg");
        const r = await uploadAvatar(form);
        if ("error" in r) setPhotoError(r.error);
        else {
          setV((old) => ({ ...old, avatarUrl: r.url || URL.createObjectURL(blob) }));
          router.refresh();
        }
      } catch {
        setPhotoError("We couldn't open that photo. Try a JPG or PNG.");
      }
    });
  }

  function removePhoto() {
    setPhotoError(null);
    startPhoto(async () => {
      const r = await removeAvatar();
      if ("error" in r) setPhotoError(r.error);
      else setV((old) => ({ ...old, avatarUrl: null }));
    });
  }

  function toggleSpecialty(id: string) {
    setSaved(false);
    setV((old) => ({
      ...old,
      specialties: old.specialties.includes(id) ? old.specialties.filter((s) => s !== id) : [...old.specialties, id].slice(0, 6),
    }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startBusy(async () => {
      const r = await saveTeacherProfile({
        headline: v.headline,
        bio: v.bio,
        specialties: v.specialties,
        speaks,
        isPublic: v.isPublic,
      });
      if ("error" in r) setError(r.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      <Card className="gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Photo</CardTitle>
          <CardDescription>Students see this next to your classes. A clear, friendly face works best.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={photoBusy}
            className="group relative rounded-full focus-visible:outline-2"
            aria-label={v.avatarUrl ? "Change photo" : "Add a photo"}
          >
            <Avatar name={v.name || "Teacher"} url={v.avatarUrl} className="size-24 text-3xl" />
            <span className="absolute right-0 bottom-0 grid size-8 place-items-center rounded-full border-2 border-card bg-gold text-white transition-transform group-hover:scale-110">
              <Camera className="size-4" aria-hidden />
            </span>
          </button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={photoBusy}>
              {photoBusy ? "Saving…" : v.avatarUrl ? "Change photo" : "Add a photo"}
            </Button>
            {v.avatarUrl && (
              <Button type="button" variant="ghost" onClick={removePhoto} disabled={photoBusy}>
                Remove
              </Button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        {photoError && (
          <p className="text-sm text-destructive" role="alert">
            {photoError}
          </p>
        )}
      </Card>

      <Card className="gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">About you</CardTitle>
          <CardDescription>Your name is {v.name || "not set yet"}. It comes from your account.</CardDescription>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="headline">Headline</Label>
          <Input id="headline" value={v.headline} onChange={(e) => { setSaved(false); setV({ ...v, headline: e.target.value }); }} placeholder="Goethe B1 examiner" maxLength={120} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bio">
            About <span className="font-normal text-subtle-foreground">(optional)</span>
          </Label>
          <Textarea id="bio" value={v.bio} onChange={(e) => { setSaved(false); setV({ ...v, bio: e.target.value }); }} placeholder="How you teach, who you help, what students say about your classes." maxLength={1200} rows={6} />
          <p className="text-[13px] text-subtle-foreground">{v.bio.length} / 1200</p>
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-[13px] font-medium text-muted-foreground">What you teach (up to 6)</legend>
          <div className="flex flex-wrap gap-1.5">
            {SPECIALTIES.map((s) => {
              const on = v.specialties.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSpecialty(s.id)}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors",
                    on ? "border-gold-ink bg-gold/30 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {on && <Check className="size-4 text-gold-ink" aria-hidden />}
                  {s.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <LanguageChips value={speaks} onChange={(x) => { setSaved(false); setSpeaks(x); }} legend="Languages you explain in (up to 3)" />

        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[15px] text-muted-foreground hover:text-foreground">
          <input type="checkbox" checked={v.isPublic} onChange={(e) => { setSaved(false); setV({ ...v, isPublic: e.target.checked }); }} className="peer sr-only" />
          <span
            aria-hidden
            className={cn(
              "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-gold-ink peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card",
              v.isPublic ? "border-gold bg-gold text-white" : "border-border",
            )}
          >
            {v.isPublic && <Check className="size-3.5" strokeWidth={3} />}
          </span>
          <span>Show my profile page to students. Your name and classes stay visible either way.</span>
        </label>
      </Card>

      {error && (
        <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success" role="status">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden /> Your profile is saved.
        </p>
      )}
      <div>
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
