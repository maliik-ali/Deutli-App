"use client";

import { useState } from "react";
import Link from "next/link";

import { AuthHeading } from "@/components/auth/auth-heading";
import { RoleToggle, type SignupRole } from "@/components/auth/role-toggle";
import { SocialButtons } from "@/components/auth/social-buttons";
import { SignupForm } from "./signup-form";

/**
 * Everything under the signup banner. Students and teachers/schools sign up here on their own;
 * a join link (locked) is always a student signup, so it shows no toggle.
 */
export function SignupBody({ joinCode, locked, initialRole }: { joinCode: string; locked: boolean; initialRole: SignupRole }) {
  const [role, setRole] = useState<SignupRole>(locked ? "student" : initialRole);
  const teacher = role === "teacher";

  function choose(next: SignupRole) {
    setRole(next);
    // Keep the address in step, so a copied link opens the same choice.
    window.history.replaceState(null, "", next === "teacher" ? "/signup?as=teacher" : "/signup");
  }

  return (
    <>
      <AuthHeading
        title={teacher ? "Create your teacher account" : "Create your account"}
        subtitle={teacher ? "Free to start. Set up your workspace and invite your students in a minute." : "Free student account — start preparing for German B1 today."}
      />
      {!locked && <RoleToggle value={role} onChange={choose} />}
      <div className="grid gap-5">
        <SignupForm joinCode={joinCode} intent={role} />
        <SocialButtons layout="bottom" next={teacher ? "/onboarding/teacher" : undefined} />
      </div>
      <p className="text-center text-[13px] text-muted-foreground">
        By creating an account you agree to our{" "}
        <Link href="/terms" prefetch={false} className="underline underline-offset-4 hover:text-foreground">Terms</Link> and{" "}
        <Link href="/privacy" prefetch={false} className="underline underline-offset-4 hover:text-foreground">Privacy policy</Link>.
      </p>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="py-3 font-semibold text-foreground underline underline-offset-4 hover:text-gold-ink">
          Log in
        </Link>
      </p>
    </>
  );
}
