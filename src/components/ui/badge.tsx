import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full text-xs font-semibold [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        count: "min-w-6 justify-center bg-ink px-2 py-0.5 text-ink-foreground",
        gold: "bg-gold-soft px-2.5 py-1 text-gold-ink",
        success: "bg-success-soft px-2.5 py-1 text-success",
        outline: "border border-border bg-card px-2.5 py-1 text-muted-foreground",
      },
    },
    defaultVariants: { variant: "outline" },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
