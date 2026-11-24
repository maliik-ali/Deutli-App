import type { Metadata } from "next";
import Link from "next/link";

import { BrandShell } from "@/components/branding/brand-shell";
import { AuthHeading } from "@/components/auth/auth-heading";
import { getBrandForSignup } from "@/lib/branding/data";
import { redirectIfLoggedIn } from "@/lib/auth/dal";
import { RoleChoice } from "@/components/auth/role-choice";
import { SocialButtons } from "@/components/auth/social-buttons";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage(props: PageProps<"/signup">) {
  await redirectIfLoggedIn();
  const sp = await props.searchParams;
  const join = typeof sp.join === "string" && /^[A-Za-z0-9]{6}$/.test(sp.join) ? sp.join.toUpperCase() : "";
  const academy = typeof sp.academy === "string" ? sp.academy.toLowerCase() : undefined;
  const as = sp.as === "teacher" ? "teacher" : sp.as === "student" ? "student" : null;
  // No join link and no choice yet: ask who is signing up.
  if (!join && !academy && !as) return <RoleChoice />;
  const teacher = as === "teacher" && !join && !academy;
  // A join code or a school link decides whose look the signup page has (colours, name, logo).
  const brand = await getBrandForSignup({ join: join || undefined, academy });
  return (
    <BrandShell brand={brand ? { name: brand.name, logoUrl: brand.logoUrl, showPoweredBy: brand.showPoweredBy } : null} vars={brand?.vars ?? {}}>
    <div className="grid gap-8">
      {brand?.name && (
        <p className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-[15px]">
          {brand.logoUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={brand.logoUrl} alt="" className="h-8 w-auto max-w-[100px] object-contain" />}
          <span>You are joining <strong>{brand.name}</strong></span>
        </p>
      )}
      <AuthHeading
        title={teacher ? "Create your teacher account" : "Create your account"}
        subtitle={teacher ? "Free to start. Set up your workspace and invite your students in a minute." : "Free student account — start preparing for German B1 today."}
      />
      <SocialButtons next={teacher ? "/onboarding/teacher" : undefined} />
      <SignupForm joinCode={join} intent={teacher ? "teacher" : "student"} />
      <p className="text-center text-[13px] text-muted-foreground">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">Terms</Link> and{" "}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">Privacy policy</Link>.
      </p>
      {!join && !academy && (
        <p className="text-center text-sm text-muted-foreground">
          {teacher ? "Not a teacher?" : "Teach German?"}{" "}
          <Link href={teacher ? "/signup?as=student" : "/signup?as=teacher"} className="py-3 font-semibold text-foreground underline underline-offset-4 hover:text-gold-ink">
            {teacher ? "Sign up as a student" : "Sign up as a teacher or school"}
          </Link>
        </p>
      )}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="py-3 font-semibold text-foreground underline underline-offset-4 hover:text-gold-ink">
          Log in
        </Link>
      </p>
    </div>
    </BrandShell>
  );
}
