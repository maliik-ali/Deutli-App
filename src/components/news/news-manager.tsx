"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Pin, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createPost, deletePost, updatePost } from "@/lib/news/actions";
import type { Post, PostKind } from "@/lib/news/data";
import { cn } from "@/lib/utils";

const KINDS: { id: PostKind; label: string; hint: string }[] = [
  { id: "news", label: "News", hint: "A new batch, an event, a change. Shown by date, newest first." },
  { id: "info", label: "Information", hint: "Things that stay: school rules, books to buy, fees, how to reach you." },
];

type Draft = { kind: PostKind; title: string; body: string; pinned: boolean };
const EMPTY: Draft = { kind: "news", title: "", body: "", pinned: false };

function PostForm({ initial, submitLabel, onDone, onCancel, action }: { initial: Draft; submitLabel: string; onDone: () => void; onCancel?: () => void; action: (d: Draft) => Promise<{ error: string } | { ok: true }> }) {
  const [d, setD] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const hint = KINDS.find((k) => k.id === d.kind)!.hint;
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await action(d);
          if ("error" in r) setError(r.error);
          else {
            setD(EMPTY);
            onDone();
          }
        });
      }}
    >
      <div className="grid gap-1.5">
        <p id="post-kind" className="text-[13px] font-medium text-muted-foreground">What is it?</p>
        <div role="radiogroup" aria-labelledby="post-kind" className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button key={k.id} type="button" role="radio" aria-checked={d.kind === k.id} onClick={() => setD({ ...d, kind: k.id })} className={cn("h-11 rounded-full border px-5 text-[14px] font-semibold transition-colors", d.kind === k.id ? "border-gold-ink bg-gold-soft text-foreground" : "border-border bg-card text-muted-foreground hover:border-gold-ink/60")}>
              {k.label}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-muted-foreground">{hint}</p>
      </div>
      <label className="grid gap-1.5 text-[13px] font-medium text-muted-foreground">
        Title
        <Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} maxLength={120} placeholder={d.kind === "news" ? "New B1 evening batch starts 5 January" : "Books you need to buy"} required />
      </label>
      <label className="grid gap-1.5 text-[13px] font-medium text-muted-foreground">
        Message
        <Textarea value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} rows={6} maxLength={4000} placeholder="Write it the way you would tell a student." required />
      </label>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={d.pinned} onChange={(e) => setD({ ...d, pinned: e.target.checked })} className="peer sr-only" />
        <span aria-hidden className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-gold-ink peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card", d.pinned ? "border-gold bg-gold text-white" : "border-border")}>{d.pinned && <Check className="size-3.5" strokeWidth={3} />}</span>
        <span className="text-[15px] font-medium">Pin to the top</span>
      </label>
      {error && <p role="alert" className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}

/** For the owner or an admin of a workspace: write news and information for all its students. */
export function NewsManager({ posts }: { posts: Post[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const refresh = () => router.refresh();

  return (
    <div className="grid gap-6">
      <Card className="max-w-[760px]">
        <div className="grid gap-1">
          <CardTitle>New post</CardTitle>
          <CardDescription>Everyone who studies with you sees it under News &amp; info in their menu. They are not emailed.</CardDescription>
        </div>
        <PostForm initial={EMPTY} submitLabel="Post" onDone={refresh} action={createPost} />
      </Card>

      <Card className="max-w-[760px]">
        <CardTitle>Your posts ({posts.length})</CardTitle>
        {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
        {posts.length === 0 ? (
          <p className="text-[14px] text-muted-foreground">Nothing yet. Start with school rules or the books students need to buy.</p>
        ) : (
          <ul className="divide-y divide-border">
            {posts.map((p) =>
              editing === p.id ? (
                <li key={p.id} className="py-4">
                  <PostForm initial={{ kind: p.kind, title: p.title, body: p.body, pinned: p.pinned }} submitLabel="Save" onCancel={() => setEditing(null)} onDone={() => { setEditing(null); refresh(); }} action={(d) => updatePost(p.id, d)} />
                </li>
              ) : (
                <li key={p.id} className="grid gap-1 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex min-w-0 flex-wrap items-center gap-2 font-semibold">
                      <span className="break-words">{p.title}</span>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{p.kind === "news" ? "News" : "Information"}</span>
                      {p.pinned && <Pin className="size-3.5 text-gold-ink" aria-label="Pinned" />}
                    </p>
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" size="icon" variant="ghost" aria-label={`Edit ${p.title}`} onClick={() => setEditing(p.id)}><Pencil className="size-4" aria-hidden /></Button>
                      <Button type="button" size="icon" variant="ghost" disabled={busy} aria-label={`Delete ${p.title}`} onClick={() => { if (window.confirm("Delete this post? Students will no longer see it.")) start(async () => { const r = await deletePost(p.id); if ("error" in r) setError(r.error); else refresh(); }); }}><Trash2 className="size-4" aria-hidden /></Button>
                    </div>
                  </div>
                  <p className="text-[12px] text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                  <p className="line-clamp-3 text-[14px] whitespace-pre-line text-muted-foreground">{p.body}</p>
                </li>
              ),
            )}
          </ul>
        )}
      </Card>
    </div>
  );
}
