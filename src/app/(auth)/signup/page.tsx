import type { Metadata } from "next";

import { BrandShell } from "@/components/branding/brand-shell";
import { getBrandForSignup } from "@/lib/branding/data";
import { redirectIfLoggedIn } from "@/lib/auth/dal";
import { SignupBody } from "./signup-body";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage(props: PageProps<"/signup">) {
  await redirectIfLoggedIn();
  const sp = await props.searchParams;
  const join = typeof sp.join === "string" && /^[A-Za-z0-9]{6}$/.test(sp.join) ? sp.join.toUpperCase() : "";
  const academy = typeof sp.academy === "string" ? sp.academy.toLowerCase() : undefined;
  const locked = !!join || !!academy;
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
      <SignupBody joinCode={join} locked={locked} initialRole={sp.as === "teacher" ? "teacher" : "student"} />
    </div>
    </BrandShell>
  );
}
