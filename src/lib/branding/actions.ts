"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { accentProblem, normaliseHex, primaryProblem } from "./colour";

const GENERIC = "That didn't work. Please try again.";
type Result = { error: string } | { ok: true };

/** The workspace a person may edit: they must be its owner or admin, and the plan decides which parts are allowed. */
async function editable() {
  const user = await requireUser(["teacher"]);
  const ws = await getMyWorkspace(user.id);
  if (!ws) return { error: "You don't have a workspace yet. Please contact us." } as const;
  if (ws.role === "teacher") return { error: "Only the workspace owner can change the branding." } as const;
  const admin = createAdminClient();
  if (!admin) return { error: GENERIC } as const;
  const { data } = ws.workspace.plan_id ? await admin.from("plans").select("features").eq("id", ws.workspace.plan_id).maybeSingle() : { data: null };
  return { ws, admin, features: ((data?.features ?? []) as string[]) } as const;
}

const schema = z.object({
  displayName: z.string().trim().max(60, "Keep the name under 60 letters."),
  primary: z.string(),
  accent: z.string(),
  fontKey: z.enum(["default", "inter", "poppins", "nunito"]),
});

export async function saveBranding(input: unknown): Promise<Result> {
  const e = await editable();
  if (e.error !== undefined) return { error: e.error };
  const p = schema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };

  const update: Record<string, string | null> = {};
  if (e.features.includes("logo")) update.display_name = p.data.displayName || null;
  if (e.features.includes("colour")) {
    const primary = normaliseHex(p.data.primary);
    const accent = normaliseHex(p.data.accent);
    if (!primary || !accent) return { error: "Enter colours like #2563eb." };
    const bad = primaryProblem(primary) ?? accentProblem(accent);
    if (bad) return { error: bad };
    update.primary_color = primary;
    update.accent_color = accent;
  }
  if (e.features.includes("font")) update.font_key = p.data.fontKey === "default" ? null : p.data.fontKey;
  if (Object.keys(update).length === 0) return { error: "Your plan doesn't include branding yet. Upgrade to change it." };

  const { error } = await e.admin.from("academies").update(update).eq("id", e.ws.workspace.id);
  if (error) return { error: GENERIC };
  revalidatePath("/", "layout");
  return { ok: true };
}

const MAX = 1024 * 1024;
const kind = (b: Uint8Array): "png" | "jpg" | "webp" | null => {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
  return null;
};

/** PNG, WebP or JPG up to 1 MB. The file type is read from the file itself, never from its name. No SVG. */
export async function uploadLogo(form: FormData): Promise<Result> {
  const e = await editable();
  if (e.error !== undefined) return { error: e.error };
  if (!e.features.includes("logo")) return { error: "Your plan doesn't include a logo yet. Upgrade to add one." };
  const file = form.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image file." };
  if (file.size > MAX) return { error: "The logo is over 1 MB. Use a smaller image." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = kind(bytes);
  if (!ext) return { error: "Use a PNG, WebP or JPG image." };

  const path = `${e.ws.workspace.id}/logo-${Date.now()}.${ext}`;
  const { error: upErr } = await e.admin.storage.from("academy-logos").upload(path, bytes, { contentType: ext === "jpg" ? "image/jpeg" : `image/${ext}`, upsert: false });
  if (upErr) return { error: GENERIC };
  const { data: old } = await e.admin.from("academies").select("logo_path").eq("id", e.ws.workspace.id).maybeSingle();
  const { error } = await e.admin.from("academies").update({ logo_path: path }).eq("id", e.ws.workspace.id);
  if (error) return { error: GENERIC };
  if (old?.logo_path) await e.admin.storage.from("academy-logos").remove([old.logo_path]);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeLogo(): Promise<Result> {
  const e = await editable();
  if (e.error !== undefined) return { error: e.error };
  const { data: old } = await e.admin.from("academies").select("logo_path").eq("id", e.ws.workspace.id).maybeSingle();
  await e.admin.from("academies").update({ logo_path: null }).eq("id", e.ws.workspace.id);
  if (old?.logo_path) await e.admin.storage.from("academy-logos").remove([old.logo_path]);
  revalidatePath("/", "layout");
  return { ok: true };
}
