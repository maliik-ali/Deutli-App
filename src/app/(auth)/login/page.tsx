import type { Metadata } from "next";
import Link from "next/link";

import { AuthHeading } from "@/components/auth/auth-heading";
import { redirectIfLoggedIn } from "@/lib/auth/dal";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

const MESSAGES: Record<string, { kind: "error" | "notice"; text: string }> = {
  link: {
    kind: "error",
    text: "That email link has expired or was already used. Log in, or request a new reset link.",
  },
  signed_out: { kind: "notice", text: "You've been logged out." },
};

export default async function LoginPage(props: PageProps<"/login">) {
  await redirectIfLoggedIn();
  const sp = await props.searchParams;
  const message = sp.error === "link" ? MESSAGES.link : sp.signed_out ? MESSAGES.signed_out : null;

  return (
    <div className="grid gap-8">
      <AuthHeading title="Welcome back" subtitle="Log in to continue your B1 preparation." />
      <LoginForm message={message} />
      <p className="text-center text-sm text-muted-foreground">
        New to Gateway2Deutsch?{" "}
        <Link href="/signup" className="font-semibold text-foreground underline underline-offset-4 hover:text-gold-ink">
          Create an account
        </Link>
      </p>
    </div>
  );
}
