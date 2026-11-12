"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeleteButton, TrackForm } from "./practice-forms";

/** One text in the admin list: title, audio status, and Open / Edit / Delete. */
export function TrackRow({
  setId,
  number,
  track,
}: {
  setId: string;
  number: number;
  track: { id: string; title: string; transcript: string; hasAudio: boolean };
}) {
  const [editing, setEditing] = useState(false);
  return (
    <li className="grid gap-4 rounded-xl border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-ink-foreground"
          aria-hidden
        >
          {number}
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="truncate text-[15px] font-semibold" lang="de">
            {track.title}
          </p>
          <p className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            {track.hasAudio ? (
              <>
                <Volume2 className="size-3.5 text-success" aria-hidden /> Audio added
              </>
            ) : (
              <>
                <VolumeX className="size-3.5" aria-hidden /> No audio yet
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button asChild variant="outline" size="sm">
            <Link href={`/practice/${track.id}`}>Open</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
            <Pencil aria-hidden /> {editing ? "Close" : "Edit"}
          </Button>
          <DeleteButton kind="track" id={track.id} label="Delete" />
        </div>
      </div>
      {editing && <TrackForm setId={setId} track={track} onSaved={() => setEditing(false)} />}
    </li>
  );
}
