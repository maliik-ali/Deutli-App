"use client";

import { cn } from "@/lib/utils";

export type SignupRole = "student" | "teacher";

const OPTIONS: { id: SignupRole; label: string }[] = [
  { id: "student", label: "Student" },
  { id: "teacher", label: "Teacher" },
];

/** "I'm joining as": a two-option button group on the signup page. Student is the default. */
export function RoleToggle({ value, onChange }: { value: SignupRole; onChange: (role: SignupRole) => void }) {
  return (
    <div className="grid gap-2.5">
      <p id="role-toggle-label" className="text-[14px] font-semibold">I’m joining as</p>
      <div role="radiogroup" aria-labelledby="role-toggle-label" className="grid grid-cols-2 gap-1 rounded-full border border-border bg-card p-1">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              "min-h-11 rounded-full border text-[15px] font-semibold transition-colors",
              value === o.id ? "border-gold-ink bg-gold-soft text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
