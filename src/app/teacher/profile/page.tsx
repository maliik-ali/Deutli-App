import type { Metadata } from "next";

import { TeacherProfileForm } from "@/components/classes/teacher-profile-form";
import { requireUser } from "@/lib/auth/dal";
import { getOwnTeacherProfile } from "@/lib/classes/data";

export const metadata: Metadata = { title: "My profile" };

export default async function TeacherProfilePage() {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const profile = await getOwnTeacherProfile(user.id);
  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-3xl font-extrabold">My profile</h1>
        <p className="text-muted-foreground">What students see about you next to your classes.</p>
      </div>
      <div className="max-w-[760px]">
        {profile ? (
          <TeacherProfileForm initial={{ ...profile, name: profile.name || user.fullName || "" }} />
        ) : (
          <p className="text-muted-foreground">Your profile isn&apos;t available right now. Please try again in a few minutes.</p>
        )}
      </div>
    </main>
  );
}
