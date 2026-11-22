import "server-only";

import QRCode from "qrcode";

import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site-url";

export const CODE_RE = /^[A-Z0-9]{6}$/;
// No 0/O or 1/I, so codes are easy to read out loud and type.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const cleanCode = (v: unknown): string | null => {
  const c = typeof v === "string" ? v.trim().toUpperCase() : "";
  return CODE_RE.test(c) ? c : null;
};

export function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export type JoinCode = { code: string; active: boolean };

/** The teacher's current code (latest one), made on first use. Call with a user whose role is already checked. */
export async function getOrCreateJoinCode(teacherId: string, academyId: string): Promise<JoinCode | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("join_codes").select("code, active").eq("teacher_id", teacherId).eq("academy_id", academyId).is("batch_id", null).order("created_at", { ascending: false }).limit(1);
  if (data && data[0]) return data[0] as JoinCode;
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    const { error } = await admin.from("join_codes").insert({ code, academy_id: academyId, teacher_id: teacherId });
    if (!error) return { code, active: true };
  }
  return null;
}

export async function joinLink(code: string): Promise<string> {
  return `${await siteUrl()}/signup?join=${code}`;
}

/** QR code as SVG text, made on the server. Black on white so every phone camera can read it. */
export async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}
