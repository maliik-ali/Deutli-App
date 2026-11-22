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
  /** The student's plan, worked out on the server. */
  plan: {
    kind: "free" | "pro" | "staff";
    /** "14 February 2027", when Pro ends (kind "pro"). */
    until: string | null;
    /** Whole days left, 0 = ends today. */
    daysLeft: number | null;
    /** Pro is about to end or has just ended (see proReminder), or null. */
    reminder: { kind: "ending" | "ended"; days: number; until: string } | null;
    /** A payment still being sorted out, or null. */
    openOrder: { id: string; reference: string; status: "pending" | "awaiting_review" } | null;
  };
  /** The workspace (school or teacher) the student joined, or null. Only students see the join section. */
  join: { workspaceName: string | null } | null;
  /** Only students can delete their own account; staff accounts are removed by an admin. */
  canDelete: boolean;
};
