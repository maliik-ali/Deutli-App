import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 text-[15px] text-foreground transition-colors outline-none placeholder:text-subtle-foreground/80",
        "focus-visible:border-ink focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-0 focus-visible:outline-ink/20",
        "aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive/25",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}

export { Input };
