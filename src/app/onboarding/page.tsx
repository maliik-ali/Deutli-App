import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Onboarding } from "@/components/onboarding/onboarding";
import { requireUser } from "@/lib/auth/dal";
import { homeForRole } from "@/lib/auth/roles";
import { getLanguage, type LanguageCode } from "@/lib/languages";

/** The first non-English language the browser or phone asks for that we support, e.g. "ur-PK" -> "ur". */
function deviceLanguage(acceptLanguage: string | null): LanguageCode | null {
  for (const part of (acceptLanguage ?? "").split(",")) {
    const code = part.split(";")[0].trim().toLowerCase().split("-")[0];
    if (code && code !== "en" && getLanguage(code)) return code as LanguageCode;
  }
  return null;
}

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage(props: PageProps<"/onboarding">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  // Asked once. "?again=1" lets a student answer again later.
  if (user.onboardedAt && sp.again !== "1") redirect(homeForRole(user.role));
  const firstName = (user.fullName ?? "").trim().split(/\s+/)[0] || null;
  return <Onboarding
      firstName={firstName}
      email={user.email}
      suggestedLanguage={deviceLanguage((await headers()).get("accept-language"))}
      languages={user.languages}
      home={homeForRole(user.role)}
    />;
}
