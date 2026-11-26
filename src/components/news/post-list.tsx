"use client";

import { useState } from "react";
import { ChevronDown, Pin } from "lucide-react";

import { markPostRead } from "@/lib/news/actions";
import type { Post } from "@/lib/news/data";
import { cn } from "@/lib/utils";

/** The school's posts as a list that opens on a tap. An unread post has a dot; opening it marks it as read. */
export function PostList({ posts, showDate }: { posts: Post[]; showDate: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [read, setRead] = useState(() => new Set(posts.filter((p) => p.read).map((p) => p.id)));

  function toggle(p: Post) {
    const opening = open !== p.id;
    setOpen(opening ? p.id : null);
    if (opening && !read.has(p.id)) {
      setRead((r) => new Set(r).add(p.id));
      markPostRead(p.id).catch(() => {});
    }
  }

  return (
    <ul className="grid gap-2">
      {posts.map((p) => {
        const isOpen = open === p.id;
        const unread = !read.has(p.id);
        return (
          <li key={p.id} className="rounded-2xl border border-border bg-card">
            <button type="button" onClick={() => toggle(p)} aria-expanded={isOpen} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left">
              <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", unread ? "bg-gold" : "bg-transparent")} />
              {unread && <span className="sr-only">New. </span>}
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="flex flex-wrap items-center gap-2 text-[16px] font-semibold">
                  <span className="break-words">{p.title}</span>
                  {p.pinned && <Pin className="size-3.5 text-gold-ink" aria-label="Pinned" />}
                </span>
                {showDate && <span className="text-[12px] text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
              </span>
              <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-hidden />
            </button>
            {isOpen && <p className="border-t border-border px-4 py-4 text-[15px] leading-relaxed whitespace-pre-line break-words">{p.body}</p>}
          </li>
        );
      })}
    </ul>
  );
}
