import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-28 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 py-3 text-[15px] leading-relaxed text-foreground transition-colors outline-none placeholder:text-subtle-foreground/80",
        "focus-visible:border-ink focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-0 focus-visible:outline-ink/20",
        "aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive/25",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
