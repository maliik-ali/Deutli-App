"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ImagePlus, LayoutDashboard, MessageCircle, MessageSquare, Timer, Video } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { accentProblem, FONT_OPTIONS, normaliseHex, primaryProblem, themeVars, type FontKey } from "@/lib/branding/colour";
import { removeLogo, saveBranding, uploadLogo } from "@/lib/branding/actions";
import { whatsappLink } from "@/lib/support/contact";

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

type PlanOption = { name: string; eur_cents: number; features: string[] };
const DRAFT_KEY = "deutli-branding-draft";
const read = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });

export function BrandingEditor({ initial, features, plans, workspaceName }: { initial: BrandingValues; features: string[]; plans: PlanOption[]; workspaceName: string }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoDraft, setLogoDraft] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);
  const loaded = useRef(false);
  const draftKey = `${DRAFT_KEY}:${workspaceName}`;
  const canLogo = features.includes("logo");

  const primary = normaliseHex(v.primary);
  const accent = normaliseHex(v.accent);
  const pProblem = primary ? primaryProblem(primary) : "Enter a colour like #2563eb.";
  const aProblem = accent ? accentProblem(accent) : "Enter a colour like #7c3aed.";
  const vars = useMemo(() => (primary && accent && !pProblem && !aProblem ? themeVars(primary, accent) : themeVars("#7161ff", "#cb3cff")), [primary, accent, pProblem, aProblem]);
  const font = FONT_OPTIONS.find((f) => f.key === v.fontKey)?.css ?? "var(--font-figtree)";
  const shownName = v.displayName.trim() || workspaceName;
  const logoShown = logoDraft ?? initial.logoUrl;

  // Anyone may try the look. Saving it needs the plan features, so work out what this look would need.
  const used = {
    logo: v.displayName.trim() !== initial.displayName.trim() || logoDraft !== null,
    colour: (primary ?? v.primary) !== initial.primary || (accent ?? v.accent) !== initial.accent,
    font: v.fontKey !== initial.fontKey,
  };
  const needed = (Object.keys(used) as (keyof typeof used)[]).filter((k) => used[k]);
  const missing = needed.filter((k) => !features.includes(k));
  const plan = plans.filter((p) => needed.every((k) => p.features.includes(k))).sort((a, b) => a.eur_cents - b.eur_cents)[0];
  const planText = plan ? `the ${plan.name} plan (€${plan.eur_cents % 100 ? (plan.eur_cents / 100).toFixed(2) : plan.eur_cents / 100} a month)` : "a bigger plan";

  // Keep an unsaved trial in this browser, so it is still here when the teacher comes back after upgrading.
  useEffect(() => {
    // After the first paint, so the server and browser render the same thing first.
    const t = setTimeout(() => {
      try {
        const raw = localStorage.getItem(draftKey);
        if (!raw) { loaded.current = true; return; }
        const d = JSON.parse(raw) as { v?: BrandingValues; logo?: string | null };
        if (d.v) setV({ ...initial, displayName: d.v.displayName ?? "", primary: d.v.primary ?? initial.primary, accent: d.v.accent ?? initial.accent, fontKey: d.v.fontKey ?? "default" });
        if (d.logo) setLogoDraft(d.logo);
      } catch { /* no saved draft */ }
      loaded.current = true;
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!loaded.current) return; // don't wipe a saved draft before it has been read
    try {
      if (missing.length) localStorage.setItem(draftKey, JSON.stringify({ v, logo: logoDraft }));
      else localStorage.removeItem(draftKey);
    } catch { /* storage full or blocked */ }
  }, [v, logoDraft, missing.length, draftKey]);

  function save(onlyIncluded = false) {
    setMsg(null);
    if (missing.length && !onlyIncluded) { setUpgrade(true); return; }
    setUpgrade(false);
    start(async () => {
      // Parts the plan doesn't include stay as they are.
      const send = onlyIncluded ? { ...v, displayName: missing.includes("logo") ? initial.displayName : v.displayName, primary: missing.includes("colour") ? initial.primary : v.primary, accent: missing.includes("colour") ? initial.accent : v.accent, fontKey: missing.includes("font") ? initial.fontKey : v.fontKey } : v;
      if (logoDraft && canLogo) {
        const fd = new FormData();
        fd.set("logo", await (await fetch(logoDraft)).blob().then((b) => new File([b], "logo.png", { type: b.type })));
        const up = await uploadLogo(fd);
        if ("error" in up) { setMsg({ ok: false, text: up.error }); return; }
        setLogoDraft(null);
      }
      const r = await saveBranding({ displayName: send.displayName, primary: send.primary, accent: send.accent, fontKey: send.fontKey });
      if ("error" in r) setMsg({ ok: false, text: r.error });
      else {
        setMsg({ ok: true, text: "Saved. Your students see the new look now." });
        if (onlyIncluded) setV(send);
        router.refresh();
      }
    });
  }
  function reset() {
    setV(initial);
    setLogoDraft(null);
    setUpgrade(false);
    setMsg(null);
  }
  function pick(file: File | undefined) {
    if (!file) return;
    setMsg(null);
    start(async () => {
      try {
        const small = await shrink(file);
        if (!canLogo) { setLogoDraft(await read(small)); return; } // try it first, upload when the plan allows
        const fd = new FormData();
        fd.set("logo", small);
        const r = await uploadLogo(fd);
        if ("error" in r) setMsg({ ok: false, text: r.error });
        else router.refresh();
      } catch {
        setMsg({ ok: false, text: "We couldn't read that image. Use a PNG, WebP or JPG." });
      }
    });
  }

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
            <Input value={v.displayName} onChange={(e) => setV({ ...v, displayName: e.target.value })} placeholder={workspaceName} maxLength={60} />
          </label>

          <div className={field}>
            <span>Logo (PNG, WebP or JPG, up to 1 MB)</span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid size-14 place-items-center overflow-hidden rounded-xl border border-border bg-background">
                {logoShown ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={logoShown} alt="Current logo" className="size-full object-contain" /> : <ImagePlus className="size-5 text-muted-foreground" aria-hidden />}
              </span>
              <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg" className="sr-only" id="logo-file" disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
                {logoShown ? "Change logo" : "Upload logo"}
              </Button>
              {logoShown && (
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { if (logoDraft) setLogoDraft(null); else start(async () => { await removeLogo(); router.refresh(); }); }}>
                  Remove
                </Button>
              )}
            </div>
          </div>

          <div className="grid items-start gap-4 sm:grid-cols-2">
            {([["primary", "Main colour", pProblem], ["accent", "Accent colour", aProblem]] as const).map(([key, label, problem]) => (
              <div key={key} className={field}>
                <label htmlFor={`c-${key}`}>{label}</label>
                <div className="flex items-center gap-2">
                  <input type="color" aria-label={`${label} picker`} value={normaliseHex(v[key]) ?? "#7161ff"} onChange={(e) => setV({ ...v, [key]: e.target.value })} className="size-11 shrink-0 cursor-pointer rounded-xl border border-input bg-card p-1" />
                  <Input id={`c-${key}`} value={v[key]} onChange={(e) => setV({ ...v, [key]: e.target.value })} className="font-mono" maxLength={7} aria-invalid={!!problem} />
                </div>
                {problem && <span role="alert" className="text-destructive">{problem}</span>}
              </div>
            ))}
          </div>

          <div className={field}>
            <label htmlFor="font">Font</label>
            <Select value={v.fontKey} onValueChange={(k) => setV({ ...v, fontKey: k as FontKey })}>
              <SelectTrigger id="font" className="h-11 rounded-xl text-[15px]"><SelectValue /></SelectTrigger>
              <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => save()} disabled={busy || !!pProblem || !!aProblem}>{busy ? "Saving…" : "Save"}</Button>
          {missing.length > 0 && !upgrade && <p className="text-[13px] text-muted-foreground">Not in your plan yet. Try it here, upgrade to keep it.</p>}
          {msg && <p role={msg.ok ? "status" : "alert"} className={`text-[13px] ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>}
        </div>

        {upgrade && missing.length > 0 && (
          <div role="region" aria-label="Upgrade to keep this look" className="grid gap-3 rounded-xl bg-muted/50 p-4">
            <div className="grid gap-1">
              <p className="text-[15px] font-semibold">Upgrade to keep this look</p>
              <p className="text-[14px] text-muted-foreground">Your look needs {planText}. Students keep seeing the normal Deutli look until you upgrade. Your changes stay here, so you can come back to them.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <a href={whatsappLink(`Hi Deutli, I'd like to upgrade ${workspaceName} to ${plan?.name ?? "a plan"} to use my own branding.`)} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden /> Upgrade on WhatsApp</a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/teacher/support?kind=question&from=/teacher/branding"><MessageSquare aria-hidden /> Message us</Link>
              </Button>
              {needed.length > missing.length && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => save(true)}>Save only what my plan includes</Button>}
              <Button type="button" size="sm" variant="outline" onClick={reset}>Go back to normal</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Live preview: the real colour variables, font and logo, so what you see is what students get. */}
      <div aria-label="Preview" style={{ ...(vars as React.CSSProperties), fontFamily: font }} className="grid gap-4 rounded-2xl border border-border bg-background p-4 text-foreground">
        <p className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">Preview</p>

        <div className="grid gap-1.5">
          <p className="text-[12px] font-semibold text-muted-foreground">Your students&apos; app</p>
          <div className="grid grid-cols-[116px_minmax(0,1fr)] overflow-hidden rounded-xl border border-border">
            <div className="grid min-w-0 content-start gap-3 overflow-hidden border-r border-border bg-card p-2.5">
              <div className="flex min-h-7 min-w-0 items-center gap-1.5">
                {logoShown && /* eslint-disable-next-line @next/next/no-img-element */ <img src={logoShown} alt="" className="h-6 w-auto max-w-[36px] shrink-0 rounded object-contain" />}
                <span className="min-w-0 truncate text-[12px] font-bold">{shownName}</span>
              </div>
              <div className="grid gap-0.5 text-[12px]">
                {([[LayoutDashboard, "Dashboard", true], [Timer, "My Exam", false], [Video, "Classes", false], [BookOpen, "Vocabulary", false]] as const).map(([Icon, label, on]) => (
                  <span key={label} className={`flex items-center gap-1.5 rounded-full px-2 py-1.5 ${on ? "bg-gold-soft font-semibold text-foreground" : "text-muted-foreground"}`}>
                    <Icon className={`size-3.5 shrink-0 ${on ? "text-gold-ink" : ""}`} aria-hidden /> <span className="truncate">{label}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="grid min-w-0 content-start gap-3 p-3">
              <div>
                <p className="text-[14px] font-bold">Welcome back</p>
                <p className="text-[12px] text-muted-foreground">Next class today at 18:00. <span className="text-gold-ink">See details</span></p>
              </div>
              <div className="grid gap-1.5 rounded-lg border border-border bg-card p-2.5">
                <div className="flex items-center justify-between text-[12px]"><span className="font-semibold">Exam readiness</span><span className="rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-semibold text-gold-ink">72%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-[72%] rounded-full bg-brand-gradient" /></div>
              </div>
              <span className="inline-flex h-9 w-fit items-center rounded-full bg-brand-gradient px-4 text-[13px] font-semibold text-white">Join class</span>
            </div>
          </div>
        </div>

        <div className="grid gap-1.5">
          <p className="text-[12px] font-semibold text-muted-foreground">Your signup page</p>
          <div className="grid justify-items-center gap-2.5 rounded-xl border border-border bg-card p-4 text-center">
            <div className="flex items-center gap-2">
              {logoShown && /* eslint-disable-next-line @next/next/no-img-element */ <img src={logoShown} alt="" className="h-8 w-auto max-w-[56px] rounded object-contain" />}
              <span className="text-[16px] font-bold">{shownName}</span>
            </div>
            <p className="text-[12px] text-muted-foreground">Create your account to join {shownName}.</p>
            <span className="h-9 w-full rounded-lg border border-input bg-background" aria-hidden />
            <span className="inline-flex h-9 w-full items-center justify-center rounded-full bg-brand-gradient text-[13px] font-semibold text-white">Create account</span>
          </div>
        </div>
      </div>
    </div>
  );
}
