"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIME_SLOTS } from "@/lib/classes/constants";
import { cn } from "@/lib/utils";

/** Date <-> "YYYY-MM-DD" in the device's own calendar (no time-zone shifting). */
const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const show = (iso: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(fromIso(iso));

const triggerClass =
  "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-input bg-card px-3.5 text-left text-[15px] outline-none transition-colors focus-visible:border-ink focus-visible:outline-[3px] focus-visible:outline-ink/20 disabled:cursor-not-allowed disabled:opacity-50";

type DatePickerProps = {
  /** "YYYY-MM-DD", or "" for no date. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Earliest day that can be picked (default: no limit). */
  min?: string;
  /** Show a Clear button, for optional dates. */
  clearable?: boolean;
  id?: string;
  className?: string;
};

/** Styled date field: a button that opens the Deutli calendar. Replaces the browser's own date input. */
export function DatePicker({ value, onChange, placeholder = "Pick a date", disabled, min, clearable, id, className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" id={id} disabled={disabled} className={cn(triggerClass, value ? "text-foreground" : "text-muted-foreground", className)}>
          {value ? show(value) : placeholder}
          <CalendarDays className="size-5 shrink-0 text-gold-ink" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <Calendar
          mode="single"
          weekStartsOn={1}
          selected={value ? fromIso(value) : undefined}
          defaultMonth={value ? fromIso(value) : undefined}
          disabled={min ? { before: fromIso(min) } : undefined}
          onSelect={(d) => {
            if (!d) return;
            onChange(toIso(d));
            setOpen(false);
          }}
        />
        {clearable && value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="mt-1 h-9 w-full rounded-full text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Clear date
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

type TimePickerProps = {
  /** "HH:MM" (24 hour), or "" for no time. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
};

/** Styled time field: quarter-hour choices in a dropdown. Replaces the browser's own time input. */
export function TimePicker({ value, onChange, placeholder = "Pick a time", disabled, id }: TimePickerProps) {
  const slots = !value || TIME_SLOTS.some((s) => s.value === value) ? TIME_SLOTS : [{ value, label: value }, ...TIME_SLOTS];
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="h-11 w-full rounded-xl text-[15px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {slots.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
