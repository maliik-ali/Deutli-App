import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { AcademyProfileView } from "@/components/academies/academy-profile-view";
import { AcademyReviews } from "@/components/reviews/reviews-section";
import { canViewAcademy, getAcademyProfileBySlug } from "@/lib/academies/profile";
import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Academy" };

export default async function AcademyPage(props: PageProps<"/dashboard/academies/[slug]">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const { slug } = await props.params;
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) notFound();
  const admin = createAdminClient();
  if (!admin) notFound();

  const academy = await getAcademyProfileBySlug(admin, slug);
  // Same answer for "no such academy" and "not yours to see", so this can't be used to find out which academies exist.
  if (!academy || !(await canViewAcademy(admin, user, academy.id))) notFound();

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="grid max-w-[960px] gap-6">
        <Link href="/dashboard/classes" className="inline-flex h-11 w-fit items-center gap-1 rounded-full pr-3 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden /> Classes
        </Link>
        <AcademyProfileView academy={academy} teacherHref={(id) => `/dashboard/teachers/${id}`} />
        <AcademyReviews admin={admin} academyId={academy.id} />
      </div>
    </main>
  );
}
