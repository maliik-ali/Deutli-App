import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TeacherOnboarding } from "@/components/onboarding/teacher-onboarding";
import { requireUser } from "@/lib/auth/dal";
import { homeForRole } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Set up your workspace" };

/** A new teacher or school answers a few questions and gets a free workspace (no admin approval). */
export default async function TeacherOnboardingPage() {
  const user = await requireUser();
  // Teachers and admins already have their home; a student who studies with a teacher cannot switch here.
  if (user.role !== "student" || user.teacherId) redirect(homeForRole(user.role));
  return <TeacherOnboarding defaultName={(user.fullName ?? "").trim()} email={user.email} />;
}
