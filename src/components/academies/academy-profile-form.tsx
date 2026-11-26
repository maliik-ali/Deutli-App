"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { AcademyProfileView, type AcademyView } from "@/components/academies/academy-profile-view";
import { LanguageChips } from "@/components/language-chips";
import { LinksFields } from "@/components/profile/links-fields";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AcademyProfileValues } from "@/lib/academies/profile";
import { saveAcademyProfile } from "@/lib/academies/profile-actions";
import { toProfileLinks } from "@/lib/profile/links";

/** The owner's form for the academy's public profile, with a live preview of what students see. */
export function AcademyProfileForm({ initial, name, logoUrl, teachers, solo }: { initial: AcademyProfileValues; name: string; logoUrl: string | null; teachers: AcademyView["teachers"]; solo: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, start] = useTransition();
  const touch = <T,>(fn: (x: T) => void) => (x: T) => { setSaved(false); fn(x); };

  const preview = useMemo<AcademyView>(
    () => ({
      name,
      logoUrl,
      tagline: v.tagline.trim() || null,
      about: v.about.trim() || null,
      country: v.country.trim() || null,
      languages: v.languages,
      // The same rules as on the page students see: a link that would not be shown there is not shown here either.
      links: toProfileLinks(v.website, v.social),
      teachers,
    }),
    [v, name, logoUrl, teachers],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    start(async () => {
      const r = await saveAcademyProfile(v);
      if ("error" in r) setError(r.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
      <form onSubmit={submit} className="grid gap-6" noValidate>
        <Card className="gap-5">
          <div className="grid gap-1">
            <CardTitle className="text-lg">About {name}</CardTitle>
            <CardDescription>
              {solo ? "If you teach alone, your teacher profile is enough. Fill this in if you want a page for your academy too. " : ""}
              The name and logo come from Branding.
            </CardDescription>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" value={v.tagline} onChange={(e) => touch(setV)({ ...v, tagline: e.target.value })} placeholder="Goethe and Telc exam preparation, A1 to B2" maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="about">
              About <span className="font-normal text-subtle-foreground">(optional)</span>
            </Label>
            <Textarea id="about" value={v.about} onChange={(e) => touch(setV)({ ...v, about: e.target.value })} placeholder="Who you teach, how your classes work, what students can expect." maxLength={800} rows={6} />
            <p className="text-[13px] text-subtle-foreground">{v.about.length} / 800</p>
          </div>
          <div className="grid gap-2 sm:max-w-sm">
            <Label htmlFor="country">Country or city</Label>
            <Input id="country" value={v.country} onChange={(e) => touch(setV)({ ...v, country: e.target.value })} placeholder="Lahore, Pakistan" maxLength={60} />
          </div>
          <LanguageChips value={v.languages} onChange={(x) => touch(setV)({ ...v, languages: x })} legend="Languages you explain in (up to 3)" />
        </Card>

        <Card className="gap-5">
          <div className="grid gap-1">
            <CardTitle className="text-lg">Links</CardTitle>
            <CardDescription>Where students can find you online. All optional.</CardDescription>
          </div>
          <LinksFields idPrefix="ac" value={{ website: v.website, social: v.social }} onChange={(l) => touch(setV)({ ...v, website: l.website, social: l.social })} />
        </Card>

        {error && (
          <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success" role="status">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden /> Your academy profile is saved.
          </p>
        )}
        <div>
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Saving…" : "Save academy profile"}
          </Button>
        </div>
      </form>

      <div className="grid gap-3 xl:sticky xl:top-6" aria-label="Preview">
        <p className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">What students see</p>
        <AcademyProfileView academy={preview} heading="h2" />
      </div>
    </div>
  );
}
