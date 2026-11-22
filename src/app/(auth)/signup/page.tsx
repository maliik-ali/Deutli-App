import type { Metadata } from "next";
import Link from "next/link";

import { AuthHeading } from "@/components/auth/auth-heading";
import { redirectIfLoggedIn } from "@/lib/auth/dal";
import { SocialButtons } from "@/components/auth/social-buttons";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage(props: PageProps<"/signup">) {
  await redirectIfLoggedIn();
  const sp = await props.searchParams;
  const join = typeof sp.join === "string" && /^[A-Za-z0-9]{6}$/.test(sp.join) ? sp.join.toUpperCase() : "";
  return (
    <div className="grid gap-8">
      <AuthHeading
        title="Create your account"
        subtitle="Free student account — start preparing for German B1 today."
      />
      <SocialButtons />
      <SignupForm joinCode={join} />
      <p className="text-center text-[13px] text-muted-foreground">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">Terms</Link> and{" "}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">Privacy policy</Link>.
      </p>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="py-3 font-semibold text-foreground underline underline-offset-4 hover:text-gold-ink">
          Log in
        </Link>
      </p>
    </div>
  );
}
