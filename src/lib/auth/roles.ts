export const ROLES = ["student", "teacher", "academy_admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

/** Pages that need a logged-in user. */
export const PROTECTED_PREFIXES = ["/dashboard", "/practice", "/teacher", "/admin"] as const;

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Where each role lands after logging in. */
export function homeForRole(role: Role): string {
  switch (role) {
    case "teacher":
      return "/teacher";
    case "academy_admin":
    case "super_admin":
      return "/admin";
    default:
      return "/dashboard";
  }
}
