"use client";

import { useRef, useState } from "react";
import { StickyNote, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TextItem } from "@/lib/papers/render";
import type { Annotation } from "./use-annotations";

export type PaperTool = "move" | "highlight" | "note" | "erase";

/** One page image of the paper with the student's own highlights and notes on top. */
export function PaperPage({ src, alt, page, tool, items, onChange, text, withWords }: { src: string; alt: string; page: number; tool: PaperTool; items: Annotation[]; onChange: (next: Annotation[]) => void; text?: TextItem[]; withWords?: (t: string) => React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const mine = items.filter((a) => a.page === page);

  const point = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };

  function down(e: React.PointerEvent) {
    if (e.target !== e.currentTarget) return;
    const p = point(e);
    if (tool === "highlight") {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    } else if (tool === "note") {
      const id = crypto.randomUUID();
      onChange([...items, { id, page, kind: "note", x: p.x, y: p.y, text: "" }]);
      setOpen(id);
    }
  }
  function move(e: React.PointerEvent) {
    if (!draft) return;
    const p = point(e);
    setDraft({ ...draft, x1: p.x, y1: p.y });
  }
  function up() {
    if (!draft) return;
    const x = Math.min(draft.x0, draft.x1);
    const y = Math.min(draft.y0, draft.y1);
    const w = Math.abs(draft.x1 - draft.x0);
    const h = Math.abs(draft.y1 - draft.y0);
    setDraft(null);
    if (w > 0.01 && h > 0.004) onChange([...items, { id: crypto.randomUUID(), page, kind: "hl", x, y, w, h }]);
  }
  const edit = (id: string, text: string) => onChange(items.map((a) => (a.id === id && a.kind === "note" ? { ...a, text } : a)));
  const remove = (id: string) => {
    onChange(items.filter((a) => a.id !== id));
    setOpen(null);
  };

  const drawing = tool === "highlight" || tool === "note";
  return (
    <div ref={box} className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" draggable={false} className="w-full rounded-sm bg-white shadow-xl shadow-black/40 select-none" />
      {text && text.length > 0 && (
        // The PDF's own text, invisible, exactly over the picture: lets the student select words.
        <div data-text-layer={page} className={cn("absolute inset-0 overflow-hidden", tool === "move" ? "" : "pointer-events-none")} style={{ containerType: "size" }}>
          {text.map(([s, x, y, w, h], i) => (
            <span
              key={i}
              data-text-item
              lang="de"
              className="absolute cursor-text leading-none whitespace-pre text-transparent selection:bg-gold/40"
              style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 120}%`, fontSize: `${h * 100}cqh`, textAlignLast: "justify" }}
            >
              {withWords ? withWords(s) : s}
            </span>
          ))}
        </div>
      )}
      <div
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => setDraft(null)}
        className={cn("absolute inset-0", drawing ? (tool === "highlight" ? "cursor-crosshair" : "cursor-cell") : "pointer-events-none")}
        style={drawing ? { touchAction: "none" } : undefined}
      >
        {mine.map((a) =>
          a.kind === "hl" ? (
            <span
              key={a.id}
              role={tool === "erase" ? "button" : undefined}
              aria-label={tool === "erase" ? "Remove highlight" : undefined}
              onClick={tool === "erase" ? () => remove(a.id) : undefined}
              className={cn("absolute rounded-[2px] bg-yellow-300/50 mix-blend-multiply", tool === "erase" ? "pointer-events-auto cursor-pointer ring-2 ring-destructive/60" : "pointer-events-none")}
              style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%`, width: `${a.w * 100}%`, height: `${a.h * 100}%` }}
            />
          ) : (
            <div key={a.id} className="pointer-events-none absolute" style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%` }}>
              <button
                type="button"
                aria-label={a.text ? `Note: ${a.text}` : "Empty note"}
                onClick={() => (tool === "erase" ? remove(a.id) : setOpen(open === a.id ? null : a.id))}
                className="pointer-events-auto grid size-9 -translate-x-1/2 -translate-y-full place-items-center rounded-full bg-yellow-300 text-neutral-900 shadow-md"
              >
                <StickyNote className="size-4" aria-hidden />
              </button>
              {open === a.id && (
                <div className={cn("pointer-events-auto absolute top-1 z-20 grid w-56 gap-2 rounded-xl border border-border bg-card p-3 shadow-xl", a.x > 0.55 ? "right-0" : "left-0")}>
                  <textarea autoFocus value={a.text} onChange={(e) => edit(a.id, e.target.value.slice(0, 500))} rows={3} aria-label="Your note" placeholder="Write a note…" className="w-full resize-none rounded-lg border border-input bg-background p-2 text-[14px] outline-none focus-visible:border-ring" />
                  <div className="flex justify-between">
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(a.id)}>
                      <Trash2 aria-hidden /> Delete
                    </Button>
                    <Button type="button" size="sm" onClick={() => setOpen(null)}>
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ),
        )}
        {draft && (
          <span className="pointer-events-none absolute bg-yellow-300/50" style={{ left: `${Math.min(draft.x0, draft.x1) * 100}%`, top: `${Math.min(draft.y0, draft.y1) * 100}%`, width: `${Math.abs(draft.x1 - draft.x0) * 100}%`, height: `${Math.abs(draft.y1 - draft.y0) * 100}%` }} />
        )}
      </div>
    </div>
  );
}
