"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/** Click to load: nothing is requested from YouTube until the student presses play (privacy). Uses the no-cookie domain. */
export function RecordingEmbed({ videoId, title }: { videoId: string; title: string }) {
  const [on, setOn] = useState(false);
  if (on) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border bg-background">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={`Recording: ${title}`}
          className="size-full"
          allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }
  return (
    <button type="button" onClick={() => setOn(true)} className="grid aspect-video w-full place-items-center rounded-2xl border border-border bg-card text-center transition-colors hover:bg-muted">
      <span className="grid justify-items-center gap-2">
        <span className="grid size-14 place-items-center rounded-full bg-brand-gradient text-white"><Play className="size-6" aria-hidden /></span>
        <span className="font-semibold">Watch the recording</span>
        <span className="max-w-xs px-4 text-[12px] text-muted-foreground">The video loads from YouTube when you press play.</span>
      </span>
    </button>
  );
}
