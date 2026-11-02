import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AuthHeading } from "@/components/auth/auth-heading";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="grid gap-8">
      <Link
        href="/login"
        className="inline-flex w-fit items-center gap-1.5 rounded text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to log in
      </Link>
      <AuthHeading
        title="Forgot your password?"
        subtitle="Enter the email you signed up with. We'll send you a link to choose a new password."
      />
      <ForgotPasswordForm />
    </div>
  );
}
