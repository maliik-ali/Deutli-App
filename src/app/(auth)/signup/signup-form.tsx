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

export function SignupForm() {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", phone: "", password: "" },
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
        id="phone"
        label="Phone"
        optional
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="+92 300 1234567"
        error={errors.phone?.message}
        hint="For class reminders from your academy."
        {...register("phone")}
      />
      <FormField
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        hint={<PasswordStrength password={password} />}
        {...register("password")}
      />
      <SubmitButton pending={pending} pendingText="Creating account…">
        Create account
      </SubmitButton>
      <p className="text-center text-[13px] text-subtle-foreground">
        Teachers and academy staff get an invite from their admin.
      </p>
    </form>
  );
}
