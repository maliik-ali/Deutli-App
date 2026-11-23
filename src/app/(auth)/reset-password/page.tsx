import type { Metadata } from "next";
import Link from "next/link";

import { AuthHeading } from "@/components/auth/auth-heading";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/dal";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage(props: PageProps<"/reset-password">) {
  const welcome = (await props.searchParams).welcome === "1";
  // The email link logs the user in for a short time so they can set a new password.
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="grid gap-8">
        <AuthHeading
          title="This link has expired"
          subtitle="Password reset links work once and for a limited time. Request a new one and use it straight away."
        />
        <Button asChild size="lg">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <AuthHeading
        title={welcome ? "Welcome to Deutli" : "Choose a new password"}
        subtitle={
          <>
            {welcome ? "Choose a password to finish setting up " : "For "}
            <span className="font-medium text-foreground">{user.email}</span>
          </>
        }
      />
      <ResetPasswordForm />
    </div>
  );
}
