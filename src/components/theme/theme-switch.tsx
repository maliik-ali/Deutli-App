"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { applyTheme, currentChoice, subscribeChoice, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

/** Light / Dark / System switch. The choice is remembered on this device and applied before the page paints (see THEME_SCRIPT). */
export function ThemeSwitch() {
  const choice = useSyncExternalStore(subscribeChoice, currentChoice, () => "dark" as ThemeChoice);

  return (
    <div role="radiogroup" aria-label="Colour theme" className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
      {OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={choice === id}
          onClick={() => applyTheme(id)}
          className={cn(
            "flex h-9 items-center justify-center gap-1.5 rounded-full text-[14px] font-medium transition-colors",
            choice === id ? "bg-gold-soft font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className={cn("size-4", choice === id && "text-gold-ink")} aria-hidden /> {label}
        </button>
      ))}
    </div>
  );
}
