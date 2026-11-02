"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = React.ComponentProps<"input"> & {
  id: string;
  label: string;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
  labelAction?: React.ReactNode;
};

/** Labelled input with hint and error text wired up for screen readers. */
export const FormField = React.forwardRef<HTMLInputElement, FieldProps>(
  function FormField({ id, label, error, hint, optional, labelAction, type, className, ...props }, ref) {
    const [visible, setVisible] = React.useState(false);
    const isPassword = type === "password";
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;

    return (
      <div className={cn("grid gap-2", className)}>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={id}>
            {label}
            {optional && <span className="ml-1 font-normal text-subtle-foreground">(optional)</span>}
          </Label>
          {labelAction}
        </div>
        <div className="relative">
          <Input
            ref={ref}
            id={id}
            type={isPassword && visible ? "text" : type}
            aria-invalid={error ? true : undefined}
            aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
            className={isPassword ? "pr-12" : undefined}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-subtle-foreground hover:text-foreground"
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
            >
              {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-[13px] font-medium text-destructive">
            {error}
          </p>
        )}
        {hint && (
          <div id={hintId} className="text-[13px] text-subtle-foreground">
            {hint}
          </div>
        )}
      </div>
    );
  }
);
