"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setDisplayCurrency } from "@/lib/pro/currency-actions";

/** Choose the currency prices are shown in. The price is always in EUR; this is only the display. */
export function CurrencyPicker({ value, options }: { value: string; options: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (options.length < 2) return null;
  return (
    <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
      <span id="cur-label">Show prices in</span>
      <Select
        value={value}
        disabled={pending}
        onValueChange={(v) =>
          start(async () => {
            await setDisplayCurrency(v);
            router.refresh();
          })
        }
      >
        <SelectTrigger aria-labelledby="cur-label" className="h-11 w-[120px] rounded-xl text-[15px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
