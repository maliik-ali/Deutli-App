"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SOCIAL_SITES, type SocialKey, type SocialLinks } from "@/lib/profile/links";

export type LinksValue = { website: string; social: SocialLinks };

/** Website plus a few social pages. Typing "instagram.com/name" is enough; the address is completed and checked on save. */
export function LinksFields({ value, onChange, idPrefix }: { value: LinksValue; onChange: (v: LinksValue) => void; idPrefix: string }) {
  const setSocial = (key: SocialKey, v: string) => onChange({ ...value, social: { ...value.social, [key]: v } });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid content-start gap-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-website`}>Website</Label>
        <Input id={`${idPrefix}-website`} inputMode="url" autoComplete="off" value={value.website} onChange={(e) => onChange({ ...value, website: e.target.value })} placeholder="www.yourschool.com" maxLength={300} />
      </div>
      {SOCIAL_SITES.map((s) => (
        <div key={s.key} className="grid content-start gap-2">
          <Label htmlFor={`${idPrefix}-${s.key}`}>{s.label}</Label>
          <Input id={`${idPrefix}-${s.key}`} inputMode="url" autoComplete="off" value={value.social[s.key] ?? ""} onChange={(e) => setSocial(s.key, e.target.value)} placeholder={s.placeholder} maxLength={300} />
        </div>
      ))}
    </div>
  );
}
