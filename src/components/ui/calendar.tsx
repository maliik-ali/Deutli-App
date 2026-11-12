"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";

/** shadcn/ui-style Calendar (react-day-picker v9), styled with the Deutli tokens. */
function Calendar({ className, classNames, showOutsideDays = true, ...props }: React.ComponentProps<typeof DayPicker>) {
  const d = getDefaultClassNames();
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-1", className)}
      classNames={{
        root: cn("w-fit", d.root),
        months: "relative flex flex-col gap-4",
        month: "flex w-full flex-col gap-3",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous:
          "grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30",
        button_next:
          "grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30",
        month_caption: "flex h-9 items-center justify-center",
        caption_label: "font-heading text-[15px] font-bold",
        month_grid: "border-collapse",
        weekdays: "flex",
        weekday: "w-10 pb-1 text-center text-[12px] font-semibold text-subtle-foreground uppercase",
        week: "mt-1 flex",
        day: "p-0 text-center",
        day_button: cn(
          "grid size-10 place-items-center rounded-full text-[14px] tabular-nums transition-colors",
          "hover:bg-gold-soft focus-visible:outline-2 focus-visible:outline-gold-ink",
        ),
        selected:
          "[&>button]:bg-brand-gradient [&>button]:font-bold [&>button]:text-white [&>button]:hover:bg-brand-gradient",
        today: "[&>button]:border [&>button]:border-gold-ink [&>button]:text-gold-ink",
        outside: "text-subtle-foreground/50",
        disabled: "text-subtle-foreground/40 [&>button]:hover:bg-transparent [&>button]:cursor-not-allowed",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className="size-5" aria-hidden />
          ) : (
            <ChevronRightIcon className="size-5" aria-hidden />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
