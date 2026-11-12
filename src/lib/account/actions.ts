"use server";

import { revalidatePath } from "next/cache";

import { AVATAR_BUCKET, getAvatarUrl } from "@/lib/account/avatar";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { changePasswordSchema, fullNameRules, phoneRules } from "@/lib/validation/auth";

export type AccountResult = { error: string } | { ok: true };

const SAVE_ERROR = "We couldn't save this. Check your internet and try again.";
const ROLES = ["student", "academy_admin", "super_admin"] as const;

function refresh() {
  // The name also shows in the sidebar and the dashboard greeting.
  revalidatePath("/dashboard", "layout");
}

const MAX_AVATAR_BYTES = 512 * 1024;
const PHOTO_ERROR = "We couldn't save your photo. Check your internet and try again.";

/** Checks the first bytes, so only real JPEG, PNG or WebP images are stored (not just the file name). */
function imageType(bytes: Uint8Array): { mime: string; ext: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return { mime: "image/png", ext: "png" };
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

/**
 * Save a new profile picture. The browser already cropped and shrank it (about 256×256).
 * Stored in the user's own folder of the private "avatars" bucket; the old photo is deleted.
 */
export async function uploadAvatar(form: FormData): Promise<{ error: string } | { url: string }> {
  const user = await requireUser(ROLES);
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo first." };
  if (file.size > MAX_AVATAR_BYTES) return { error: "That photo is too big. Try another one." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = imageType(bytes);
  if (!type) return { error: "Please choose a JPG, PNG or WebP photo." };

  const supabase = await createClient();
  const path = `${user.id}/${crypto.randomUUID()}.${type.ext}`;
  const upload = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, { contentType: type.mime, cacheControl: "3600", upsert: false });
  if (upload.error) return { error: PHOTO_ERROR };

  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
  if (error) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    return { error: PHOTO_ERROR };
  }
  if (user.avatarPath) await supabase.storage.from(AVATAR_BUCKET).remove([user.avatarPath]);

  refresh();
  return { url: (await getAvatarUrl(path)) ?? "" };
}

export async function removeAvatar(): Promise<AccountResult> {
  const user = await requireUser(ROLES);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ avatar_path: null }).eq("id", user.id);
  if (error) return { error: SAVE_ERROR };
  if (user.avatarPath) await supabase.storage.from(AVATAR_BUCKET).remove([user.avatarPath]);
  refresh();
  return { ok: true };
}

/** Change your own name. Only full_name and phone can be changed by the user (database grant). */
export async function updateFullName(value: unknown): Promise<AccountResult> {
  const user = await requireUser(ROLES);
  const parsed = fullNameRules.safeParse(value);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data }).eq("id", user.id);
  if (error) return { error: SAVE_ERROR };
  refresh();
  return { ok: true };
}

export async function updatePhone(value: unknown): Promise<AccountResult> {
  const user = await requireUser(ROLES);
  const parsed = phoneRules.safeParse(value);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ phone: parsed.data || null })
    .eq("id", user.id);
  if (error) return { error: SAVE_ERROR };
  refresh();
  return { ok: true };
}

/** Change password. Checks the current password first, so a borrowed open laptop can't change it. */
export async function changePassword(input: unknown): Promise<AccountResult> {
  const user = await requireUser(ROLES);
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!user.email) return { error: SAVE_ERROR };

  const supabase = await createClient();
  const check = await supabase.auth.signInWithPassword({ email: user.email, password: parsed.data.currentPassword });
  if (check.error) {
    const limited = check.error.status === 429 || check.error.code?.includes("rate_limit");
    return {
      error: limited
        ? "Too many attempts. Please wait a few minutes and try again."
        : "Your current password isn't right. Check it and try again.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "weak_password") return { error: "That password is too easy to guess. Use a longer one." };
    if (error.code === "same_password") return { error: "Your new password must be different from your current one." };
    return { error: SAVE_ERROR };
  }
  return { ok: true };
}
