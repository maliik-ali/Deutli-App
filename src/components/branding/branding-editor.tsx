"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { accentProblem, FONT_OPTIONS, normaliseHex, primaryProblem, themeVars, type FontKey } from "@/lib/branding/colour";
import { removeLogo, saveBranding, uploadLogo } from "@/lib/branding/actions";

export type BrandingValues = { displayName: string; primary: string; accent: string; fontKey: FontKey; logoUrl: string | null };

/** Shrinks a chosen image to at most 512 px (PNG) in the browser, so the upload is small and always a clean image. */
async function shrink(file: File): Promise<File> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * scale));
  c.height = Math.max(1, Math.round(bmp.height * scale));
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!blob) throw new Error("no blob");
  return new File([blob], "logo.png", { type: "image/png" });
}

export function BrandingEditor({ initial, features, workspaceName }: { initial: BrandingValues; features: string[]; workspaceName: string }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const canLogo = features.includes("logo");
  const canColour = features.includes("colour");
  const canFont = features.includes("font");

  const primary = normaliseHex(v.primary);
  const accent = normaliseHex(v.accent);
  const pProblem = primary ? primaryProblem(primary) : "Enter a colour like #2563eb.";
  const aProblem = accent ? accentProblem(accent) : "Enter a colour like #7c3aed.";
  const vars = useMemo(() => (primary && accent && !pProblem && !aProblem ? themeVars(primary, accent) : themeVars("#7161ff", "#cb3cff")), [primary, accent, pProblem, aProblem]);
  const font = FONT_OPTIONS.find((f) => f.key === v.fontKey)?.css ?? "var(--font-figtree)";
  const shownName = v.displayName.trim() || workspaceName;

  function save() {
    setMsg(null);
    start(async () => {
      const r = await saveBranding({ displayName: v.displayName, primary: v.primary, accent: v.accent, fontKey: v.fontKey });
      if ("error" in r) setMsg({ ok: false, text: r.error });
      else {
        setMsg({ ok: true, text: "Saved. Your students see the new look now." });
        router.refresh();
      }
    });
  }
  function pick(file: File | undefined) {
    if (!file) return;
    setMsg(null);
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("logo", await shrink(file));
        const r = await uploadLogo(fd);
        if ("error" in r) setMsg({ ok: false, text: r.error });
        else router.refresh();
      } catch {
        setMsg({ ok: false, text: "We couldn't read that image. Use a PNG, WebP or JPG." });
      }
    });
  }

  const locked = (what: string) => (
    <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
      <Lock className="size-3.5" aria-hidden /> {what} is part of a paid plan.
    </p>
  );
  const field = "grid gap-1.5 text-[13px] font-medium text-muted-foreground";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
      <Card className="grid gap-6">
        <div className="grid gap-1">
          <CardTitle>Your look</CardTitle>
          <CardDescription>Students see your name, logo and colours in the app and on the signup page.</CardDescription>
        </div>

        <div className="grid gap-5">
          <label className={field}>
            Name shown to students
            <Input value={v.displayName} onChange={(e) => setV({ ...v, displayName: e.target.value })} placeholder={workspaceName} maxLength={60} disabled={!canLogo} />
          </label>

          <div className={field}>
            <span>Logo (PNG, WebP or JPG, up to 1 MB)</span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid size-14 place-items-center overflow-hidden rounded-xl border border-border bg-background">
                {initial.logoUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={initial.logoUrl} alt="Current logo" className="size-full object-contain" /> : <ImagePlus className="size-5 text-muted-foreground" aria-hidden />}
              </span>
              <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg" className="sr-only" id="logo-file" disabled={!canLogo || busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
              <Button type="button" size="sm" variant="outline" disabled={!canLogo || busy} onClick={() => fileRef.current?.click()}>
                {initial.logoUrl ? "Change logo" : "Upload logo"}
              </Button>
              {initial.logoUrl && (
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => start(async () => { await removeLogo(); router.refresh(); })}>
                  Remove
                </Button>
              )}
            </div>
            {!canLogo && locked("A logo")}
          </div>

          <div className="grid items-start gap-4 sm:grid-cols-2">
            {([["primary", "Main colour", pProblem], ["accent", "Accent colour", aProblem]] as const).map(([key, label, problem]) => (
              <div key={key} className={field}>
                <label htmlFor={`c-${key}`}>{label}</label>
                <div className="flex items-center gap-2">
                  <input type="color" aria-label={`${label} picker`} value={normaliseHex(v[key]) ?? "#7161ff"} disabled={!canColour} onChange={(e) => setV({ ...v, [key]: e.target.value })} className="size-11 shrink-0 cursor-pointer rounded-xl border border-input bg-card p-1 disabled:opacity-60" />
                  <Input id={`c-${key}`} value={v[key]} onChange={(e) => setV({ ...v, [key]: e.target.value })} disabled={!canColour} className="font-mono" maxLength={7} aria-invalid={!!problem} />
                </div>
                {canColour && problem && <span role="alert" className="text-destructive">{problem}</span>}
              </div>
            ))}
            {!canColour && <div className="sm:col-span-2">{locked("Your own colours")}</div>}
          </div>

          <div className={field}>
            <label htmlFor="font">Font</label>
            <Select value={v.fontKey} onValueChange={(k) => setV({ ...v, fontKey: k as FontKey })} disabled={!canFont}>
              <SelectTrigger id="font" className="h-11 rounded-xl text-[15px]"><SelectValue /></SelectTrigger>
              <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
            {!canFont && locked("Choosing a font")}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={busy || (canColour && (!!pProblem || !!aProblem))}>{busy ? "Saving…" : "Save"}</Button>
          {msg && <p role={msg.ok ? "status" : "alert"} className={`text-[13px] ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>}
        </div>
      </Card>

      {/* Live preview: the real colour variables and font, so what you see is what students get. */}
      <div aria-label="Preview" style={{ ...(vars as React.CSSProperties), fontFamily: font }} className="grid gap-3 rounded-2xl border border-border bg-background p-4 text-foreground">
        <p className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">Preview</p>
        <div className="flex items-center gap-2.5">
          {initial.logoUrl && <span className="grid size-9 place-items-center overflow-hidden rounded-md">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={initial.logoUrl} alt="" className="size-full object-contain" /></span>}
          <span className="text-[18px] font-bold">{shownName}</span>
        </div>
        <div className="grid gap-1 rounded-xl bg-card p-3">
          <span className="rounded-full bg-gold-soft px-3 py-2 text-[14px] font-semibold">My B1 Exam</span>
          <span className="px-3 py-2 text-[14px] text-muted-foreground">Classes</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-bold">Welcome back</p>
          <p className="mb-3 text-[13px] text-muted-foreground">Next class today at 18:00. <span className="text-gold-ink">See details</span></p>
          <span className="inline-flex h-10 items-center rounded-full bg-brand-gradient px-5 text-[14px] font-semibold text-white">Join class</span>
        </div>
      </div>
    </div>
  );
}
