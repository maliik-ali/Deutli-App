import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Onboarding } from "@/components/onboarding/onboarding";
import { requireUser } from "@/lib/auth/dal";
import { homeForRole } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage(props: PageProps<"/onboarding">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  // Asked once. "?again=1" lets a student answer again later.
  if (user.onboardedAt && sp.again !== "1") redirect(homeForRole(user.role));
  const firstName = (user.fullName ?? "").trim().split(/\s+/)[0] || null;
  return <Onboarding firstName={firstName} languages={user.languages} home={homeForRole(user.role)} />;
}
