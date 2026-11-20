import type { LanguageCode } from "@/lib/languages";

export type Row = "photo" | "name" | "email" | "phone" | "password" | "languages" | "timezone" | "delete";

export type AccountInfo = {
  fullName: string;
  email: string;
  /** New email waiting for the user to open the confirmation link, or null. */
  pendingEmail: string | null;
  phone: string;
  languages: LanguageCode[];
  avatarUrl: string | null;
  /** IANA time zone, e.g. "Europe/Berlin". */
  timeZone: string;
  /** How this person can log in. */
  signIn: {
    /** The connected Google account (from Google's sign-in details), or null. */
    google: { name: string | null; email: string | null; avatarUrl: string | null } | null;
    password: boolean;
  };
  /** Only students can delete their own account; staff accounts are removed by an admin. */
  canDelete: boolean;
};
