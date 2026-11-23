"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormError } from "@/components/auth/form-error";
import { FormField } from "@/components/auth/form-field";
import { PasswordStrength } from "@/components/auth/password-strength";
import { SubmitButton } from "@/components/auth/submit-button";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";
import { signUp } from "../actions";

export function SignupForm({ joinCode = "" }: { joinCode?: string }) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  // The code field stays hidden unless the student has a code (from a join link) or asks for it.
  const [showCode, setShowCode] = useState(!!joinCode);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", phone: "", password: "", joinCode },
  });
  const password = useWatch({ control, name: "password" });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await signUp(values);
      if (result?.error) setServerError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <FormError message={serverError} />
      <FormField
        id="fullName"
        label="Full name"
        autoComplete="name"
        placeholder="Ayesha Khan"
        error={errors.fullName?.message}
        {...register("fullName")}
      />
      <FormField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <FormField
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        placeholder="8+ characters, a letter and a number"
        error={errors.password?.message}
        hint={password ? <PasswordStrength password={password} showRule={false} /> : undefined}
        {...register("password")}
      />
      {showCode ? (
        <FormField
          id="joinCode"
          label="Teacher or school code"
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="ABC234"
          error={errors.joinCode?.message}
          {...register("joinCode")}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowCode(true)}
          className="inline-flex min-h-11 w-fit items-center text-[14px] font-semibold text-gold-ink underline-offset-4 hover:underline"
        >
          Have a teacher or school code?
        </button>
      )}
      <SubmitButton pending={pending} pendingText="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
