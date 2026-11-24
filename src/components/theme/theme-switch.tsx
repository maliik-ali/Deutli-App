"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

import { applyTheme, currentTheme, subscribeTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];

/** Light / Dark switch. The choice is remembered on this device and applied before the page paints (see ThemeScript). */
export function ThemeSwitch() {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, () => "dark" as Theme);
  const choose = applyTheme;

  return (
    <div role="radiogroup" aria-label="Colour theme" className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
      {OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={theme === id}
          onClick={() => choose(id)}
          className={cn(
            "flex h-9 items-center justify-center gap-1.5 rounded-full text-[14px] font-medium transition-colors",
            theme === id ? "bg-gold-soft font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className={cn("size-4", theme === id && "text-gold-ink")} aria-hidden /> {label}
        </button>
      ))}
    </div>
  );
}
