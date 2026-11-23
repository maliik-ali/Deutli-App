"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AVATAR_BUCKET, getAvatarUrl } from "@/lib/account/avatar";
import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { isTimeZone } from "@/lib/time";
import { changePasswordSchema, emailRules, fullNameRules, phoneRules } from "@/lib/validation/auth";

export type AccountResult = { error: string } | { ok: true };

const SAVE_ERROR = "We couldn't save this. Check your internet and try again.";
const ROLES = ["student", "teacher", "academy_admin", "super_admin"] as const;

function refresh() {
  // The name also shows in the sidebar and the dashboard greeting.
  revalidatePath("/dashboard", "layout");
  revalidatePath("/teacher", "layout");
  revalidatePath("/admin", "layout");
}

/** Where each role's Account page lives (the email-change link brings them back here). */
const ACCOUNT_PATH = { student: "/dashboard/account", teacher: "/teacher/account", academy_admin: "/admin/account", super_admin: "/admin/account" } as const;

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

/**
 * Save the time zone the device reports, the first time only. A time zone the user chose
 * on the Account page is never overwritten. Works for every role.
 */
export async function saveDetectedTimeZone(value: unknown): Promise<{ error: string } | { changed: boolean }> {
  const user = await requireUser();
  if (!isTimeZone(value)) return { error: SAVE_ERROR };
  if (user.timeZoneSaved) return { changed: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ time_zone: value })
    .eq("id", user.id)
    .is("time_zone", null);
  if (error) return { error: SAVE_ERROR };
  revalidatePath("/", "layout");
  return { changed: true };
}

/** The user picks their time zone on the Account page. */
export async function setMyTimeZone(value: unknown): Promise<AccountResult> {
  const user = await requireUser();
  if (!isTimeZone(value)) return { error: "Choose a time zone from the list." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ time_zone: value }).eq("id", user.id);
  if (error) return { error: SAVE_ERROR };
  revalidatePath("/", "layout");
  return { ok: true };
}

const DELETE_WORD = "DELETE";

/**
 * Delete your own account for good (students only; staff accounts are removed by an admin).
 * Removes the profile photo, unpaid orders, then the login; everything linked to the user
 * is deleted by the database. Paid orders are kept without the link to the person,
 * because payment records must be kept by law (see migration 27).
 */
export async function deleteMyAccount(confirmation: unknown): Promise<{ error: string }> {
  const user = await requireUser(["student"]);
  if (typeof confirmation !== "string" || confirmation.trim().toUpperCase() !== DELETE_WORD) {
    return { error: `Type ${DELETE_WORD} to confirm.` };
  }
  const admin = createAdminClient();
  if (!admin) return { error: "We couldn't delete your account right now. Please try again later." };

  const { data: files } = await admin.storage.from(AVATAR_BUCKET).list(user.id);
  if (files?.length) {
    await admin.storage.from(AVATAR_BUCKET).remove(files.map((f) => `${user.id}/${f.name}`));
  }
  await admin.from("orders").delete().eq("user_id", user.id).neq("status", "paid");

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "We couldn't delete your account. Please try again, or contact us." };

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}

/**
 * Start changing your email. Supabase sends a confirmation link (to the new address, and to the
 * current one too when "secure email change" is on). The email only changes after the link is opened.
 */
export async function requestEmailChange(value: unknown): Promise<{ error: string } | { sentTo: string }> {
  const user = await requireUser(ROLES);
  const parsed = emailRules.safeParse(value);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data.toLowerCase();
  if (email === user.email?.toLowerCase()) return { error: "That's already your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${await siteUrl()}/auth/confirm?next=${ACCOUNT_PATH[user.role]}` },
  );
  if (error) {
    if (error.code === "email_exists") return { error: "Another account already uses that email." };
    if (error.code === "email_address_invalid") return { error: "That email address can't be used. Try another one." };
    if (error.status === 429 || error.code?.includes("rate_limit"))
      return { error: "Too many emails sent. Please wait a few minutes and try again." };
    return { error: SAVE_ERROR };
  }
  return { sentTo: email };
}
