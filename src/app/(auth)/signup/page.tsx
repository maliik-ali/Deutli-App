import type { Metadata } from "next";
import Link from "next/link";

import { AuthHeading } from "@/components/auth/auth-heading";
import { redirectIfLoggedIn } from "@/lib/auth/dal";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  await redirectIfLoggedIn();
  return (
    <div className="grid gap-8">
      <AuthHeading
        title="Create your account"
        subtitle="Free student account — start preparing for German B1 today."
      />
      <SignupForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-foreground underline underline-offset-4 hover:text-gold-ink">
          Log in
        </Link>
      </p>
    </div>
  );
}
