import "server-only";

import type { User } from "@supabase/supabase-js";

import { AVATAR_BUCKET } from "@/lib/account/avatar";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 512 * 1024;

/** Only real JPEG, PNG or WebP images (checked by their first bytes). */
function imageType(bytes: Uint8Array): { mime: string; ext: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return { mime: "image/png", ext: "png" };
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

/** Google's photo link, asked for at 256px, and only from Google's own image hosts. */
function googlePhotoUrl(user: User): string | null {
  const data = user.identities?.find((i) => i.provider === "google")?.identity_data;
  const raw = data?.avatar_url ?? data?.picture;
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".googleusercontent.com")) return null;
    // Links end in "=s96-c" (96px); ask for 256px like our own photos.
    url.pathname = url.pathname.replace(/=s\d+(-c)?$/, "=s256-c");
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * After a Google sign-in: copy the Google profile photo into the user's Deutli photo,
 * once, and only if they have no photo yet. Never throws; login must never fail because of this.
 */
export async function importGooglePhoto(user: User): Promise<void> {
  try {
    const source = googlePhotoUrl(user);
    if (!source) return;
    const admin = createAdminClient();
    if (!admin) return;

    const { data: profile } = await admin
      .from("profiles")
      .select("avatar_path, google_photo_checked_at")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile || profile.google_photo_checked_at) return;

    // Remember the attempt first, so a removed photo is never brought back.
    await admin.from("profiles").update({ google_photo_checked_at: new Date().toISOString() }).eq("id", user.id);
    if (profile.avatar_path) return;

    const res = await fetch(source, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!res.ok) return;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_BYTES) return;
    const type = imageType(bytes);
    if (!type) return;

    const path = `${user.id}/${crypto.randomUUID()}.${type.ext}`;
    const upload = await admin.storage
      .from(AVATAR_BUCKET)
      .upload(path, bytes, { contentType: type.mime, cacheControl: "3600", upsert: false });
    if (upload.error) return;

    const { data: saved } = await admin
      .from("profiles")
      .update({ avatar_path: path })
      .eq("id", user.id)
      .is("avatar_path", null)
      .select("id");
    if (!saved?.length) await admin.storage.from(AVATAR_BUCKET).remove([path]);
  } catch {
    // Ignore: the user simply keeps their initials.
  }
}
