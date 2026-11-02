import { SignOutButton } from "@/components/sign-out-button";

export function UserFooter({ name, email }: { name: string; email: string | null }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <div className="grid gap-1 border-t border-border pt-4">
      <div className="flex items-center gap-3 px-2 py-1">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-ink font-heading text-[13px] font-bold text-ink-foreground"
          aria-hidden
        >
          {initials || "S"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          {email && <p className="truncate text-[13px] text-subtle-foreground">{email}</p>}
        </div>
      </div>
      <SignOutButton />
    </div>
  );
}
