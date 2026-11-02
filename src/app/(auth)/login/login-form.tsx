"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormError, FormNotice } from "@/components/auth/form-error";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { signIn } from "../actions";

export function LoginForm({
  message,
}: {
  message: { kind: "error" | "notice"; text: string } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await signIn(values);
      if (result?.error) setServerError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      {!serverError && message?.kind === "error" && <FormError message={message.text} />}
      {!serverError && message?.kind === "notice" && <FormNotice message={message.text} />}
      <FormError message={serverError} />
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
        autoComplete="current-password"
        error={errors.password?.message}
        labelAction={
          <Link
            href="/forgot-password"
            className="-my-3 rounded py-3 text-sm font-medium text-gold-ink underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        }
        {...register("password")}
      />
      <SubmitButton pending={pending} pendingText="Logging in…">
        Log in
      </SubmitButton>
    </form>
  );
}
