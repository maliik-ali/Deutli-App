"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

type Props = {
  options: SelectOption[];
  /** Controlled value. Use `defaultValue` instead inside plain `<form>`s. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Sends the choice with a plain `<form>` submit. */
  name?: string;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
};

/** A dropdown from a list of options, in the Deutli style. Replaces the browser's own dropdown. */
export function OptionSelect({ options, value, defaultValue, onChange, name, id, disabled, placeholder, className, ...rest }: Props) {
  return (
    <Select value={value} defaultValue={defaultValue} onValueChange={onChange} name={name} disabled={disabled}>
      <SelectTrigger id={id} aria-label={rest["aria-label"]} className={cn("h-11 rounded-xl text-[15px]", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
