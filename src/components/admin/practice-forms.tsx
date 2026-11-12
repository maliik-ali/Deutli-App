"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAudioUploadUrl,
  createPracticeSet,
  deletePracticeSet,
  deletePracticeTrack,
  savePracticeTrack,
  setPracticeSetPublished,
} from "@/lib/practice/actions";
import { LEVELS } from "@/lib/practice/levels";
import { cn } from "@/lib/utils";

const FIELD =
  "w-full rounded-xl border border-input bg-card px-3.5 text-[15px] text-foreground outline-none transition-colors placeholder:text-subtle-foreground/80 focus-visible:border-ink focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-0 focus-visible:outline-ink/20";
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

/** "New set" form. After saving it opens the new set so texts can be added. */
export function NewSetForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const result = await createPracticeSet({
        title: form.get("title"),
        description: form.get("description") || undefined,
        level: form.get("level"),
      });
      if (result && "error" in result) setError(result.error);
      else if (result && "id" in result) router.push(`/admin/daily-practice/${result.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
        <div className="grid gap-2">
          <Label htmlFor="set-title">Title</Label>
          <Input id="set-title" name="title" required maxLength={120} placeholder="e.g. Im Büro" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="set-level">Level</Label>
          <select id="set-level" name="level" defaultValue="B1" className={cn(FIELD, "h-11")}>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="set-description">
          Short description <span className="font-normal text-subtle-foreground">(optional)</span>
        </Label>
        <Input id="set-description" name="description" maxLength={300} placeholder="What is this set about?" />
      </div>
      <Button type="submit" disabled={pending} className="w-full sm:w-fit">
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? "Creating…" : "Create set"}
      </Button>
    </form>
  );
}

/** Add a new text, or change an existing one (when `track` is given). */
export function TrackForm({
  setId,
  track,
  onSaved,
}: {
  setId: string;
  track?: { id: string; title: string; transcript: string; hasAudio: boolean };
  onSaved?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const uid = track?.id ?? "new";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("audio");
    const audio = file instanceof File && file.size > 0 ? file : null;
    setError(null);

    if (audio && audio.size > MAX_AUDIO_BYTES) {
      setError("This audio file is larger than 50 MB. Please export it as MP3 and try again.");
      return;
    }

    start(async () => {
      let audioPath: string | undefined;
      if (audio) {
        setStatus("Uploading audio…");
        const link = await createAudioUploadUrl(setId, audio.name);
        if ("error" in link) {
          setStatus(null);
          setError(link.error);
          return;
        }
        // The file goes straight from this browser to storage with the one-time link.
        const body = new FormData();
        body.append("cacheControl", "3600");
        body.append("", audio);
        const res = await fetch(link.signedUrl, { method: "PUT", body, headers: { "x-upsert": "false" } }).catch(
          () => null
        );
        if (!res?.ok) {
          setStatus(null);
          setError("The audio upload failed. Check your internet connection and try again.");
          return;
        }
        audioPath = link.path;
      }

      setStatus("Saving…");
      const result = await savePracticeTrack({
        setId,
        trackId: track?.id,
        title: form.get("title"),
        transcript: form.get("transcript"),
        audioPath,
      });
      setStatus(null);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (!track) formRef.current?.reset();
      onSaved?.();
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4" noValidate>
      <FormError message={error} />
      <div className="grid gap-2">
        <Label htmlFor={`track-title-${uid}`}>Title</Label>
        <Input
          id={`track-title-${uid}`}
          name="title"
          required
          maxLength={160}
          defaultValue={track?.title}
          placeholder="e.g. Einen Termin verschieben"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`track-audio-${uid}`}>
          Audio file{" "}
          {track?.hasAudio && <span className="font-normal text-subtle-foreground">(leave empty to keep the current audio)</span>}
        </Label>
        <input
          id={`track-audio-${uid}`}
          name="audio"
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.ogg"
          aria-describedby={`track-audio-hint-${uid}`}
          className={cn(
            FIELD,
            "h-auto py-2 file:mr-3 file:h-9 file:cursor-pointer file:rounded-full file:border-0 file:bg-ink file:px-4 file:text-[13px] file:font-semibold file:text-ink-foreground"
          )}
        />
        <p id={`track-audio-hint-${uid}`} className="text-[13px] text-muted-foreground">
          MP3, M4A, WAV or OGG, up to 50 MB.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`track-text-${uid}`}>Text of the audio</Label>
        <textarea
          id={`track-text-${uid}`}
          name="transcript"
          required
          rows={10}
          maxLength={20000}
          lang="de"
          defaultValue={track?.transcript}
          aria-describedby={`track-text-hint-${uid}`}
          placeholder={"Jana: Guten Morgen! Wie geht's?\nTom: Danke, gut. Und dir?"}
          className={cn(FIELD, "min-h-40 py-3 leading-relaxed")}
        />
        <p id={`track-text-hint-${uid}`} className="text-[13px] text-muted-foreground">
          One sentence or speaker turn per line. Start a line with a name and a colon (Jana: …) to show who speaks.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {pending ? (status ?? "Saving…") : track ? "Save changes" : "Add text"}
        </Button>
      </div>
    </form>
  );
}

/** Publish / unpublish switch for a set. */
export function PublishButton({ setId, published }: { setId: string; published: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        variant={published ? "outline" : "default"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await setPracticeSetPublished(setId, !published);
            setError(r?.error ?? null);
          })
        }
      >
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {published ? "Unpublish" : "Publish for students"}
      </Button>
      {error && (
        <p className="basis-full text-[13px] text-destructive" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

/** Delete button that asks once more before deleting. */
export function DeleteButton({
  kind,
  id,
  label,
  redirectTo,
}: {
  kind: "set" | "track";
  id: string;
  label: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!confirming)
    return (
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setConfirming(true)}>
        <Trash2 aria-hidden /> {label}
      </Button>
    );

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-[13px] text-muted-foreground">
        {kind === "set" ? "Delete this set and all its texts?" : "Delete this text and its audio?"}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        className="border-destructive/50 text-destructive hover:bg-destructive-soft hover:text-destructive"
        onClick={() =>
          start(async () => {
            const r = kind === "set" ? await deletePracticeSet(id) : await deletePracticeTrack(id);
            if (r?.error) setError(r.error);
            else if (redirectTo) router.push(redirectTo);
            else setConfirming(false);
          })
        }
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
        Cancel
      </Button>
      {error && (
        <span className="text-[13px] text-destructive" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
