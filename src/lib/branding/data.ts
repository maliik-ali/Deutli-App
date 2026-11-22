import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { FONT_OPTIONS, hexOk, themeVars } from "./colour";

/** What the screens need to look like a workspace. Null fields mean "use Deutli's own look". */
export type Brand = {
  academyId: string;
  name: string | null;
  logoUrl: string | null;
  /** CSS variables to put on the page wrapper (colours and font). Empty = Deutli default. */
  vars: Record<string, string>;
  showPoweredBy: boolean;
};

type Row = {
  id: string;
  name: string;
  display_name: string | null;
  logo_path: string | null;
  primary_color: string | null;
  accent_color: string | null;
  font_key: string | null;
  show_powered_by: boolean;
  plans: { features: string[] } | null;
};

const COLS = "id, name, display_name, logo_path, primary_color, accent_color, font_key, show_powered_by, plans:plan_id(features)";

export function logoPublicUrl(path: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return path && base ? `${base.replace(/\/$/, "")}/storage/v1/object/public/academy-logos/${path}` : null;
}

function toBrand(r: Row): Brand {
  const f = r.plans?.features ?? [];
  const vars: Record<string, string> = {};
  // Only what the plan includes is applied. A plan without "colour" keeps Deutli's colours even if old values are saved.
  if (f.includes("colour") && hexOk(r.primary_color)) Object.assign(vars, themeVars(r.primary_color, hexOk(r.accent_color) ? r.accent_color : r.primary_color));
  if (f.includes("font") && r.font_key) {
    const font = FONT_OPTIONS.find((o) => o.key === r.font_key);
    if (font) {
      vars["--font-sans"] = font.css;
      vars["--font-heading"] = font.css;
    }
  }
  return {
    academyId: r.id,
    name: r.display_name || r.name,
    logoUrl: f.includes("logo") ? logoPublicUrl(r.logo_path) : null,
    vars,
    // "Powered by Deutli" can only be hidden on a plan with the remove_branding feature. Checked here, on the server.
    showPoweredBy: r.show_powered_by || !f.includes("remove_branding"),
  };
}

export async function getBrandById(academyId: string | null | undefined): Promise<Brand | null> {
  const admin = createAdminClient();
  if (!admin || !academyId) return null;
  const { data } = await admin.from("academies").select(COLS).eq("id", academyId).maybeSingle();
  return data ? toBrand(data as unknown as Row) : null;
}

/** The brand of the workspace a person belongs to (students and teachers alike). Null for people without one. */
export async function getBrandForUser(userId: string): Promise<Brand | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: p } = await admin.from("profiles").select("academy_id").eq("id", userId).maybeSingle();
  return getBrandById(p?.academy_id);
}

/** For login/signup before anyone is logged in: a join code or a workspace slug decides the brand. */
export async function getBrandForSignup(opts: { join?: string; academy?: string }): Promise<Brand | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  if (opts.join) {
    const { data } = await admin.from("join_codes").select("academy_id").eq("code", opts.join).eq("active", true).maybeSingle();
    if (data) return getBrandById(data.academy_id);
  }
  if (opts.academy && /^[a-z0-9][a-z0-9-]{1,40}$/.test(opts.academy)) {
    const { data } = await admin.from("academies").select("id").eq("slug", opts.academy).maybeSingle();
    if (data) return getBrandById(data.id);
  }
  return null;
}
