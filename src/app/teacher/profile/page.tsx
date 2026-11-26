import type { Metadata } from "next";
import Link from "next/link";

import { AcademyProfileSection } from "@/components/academies/academy-profile-section";
import { TeacherProfileForm } from "@/components/classes/teacher-profile-form";
import { DefaultRoomForm } from "@/components/classes/default-room-form";
import { requireUser } from "@/lib/auth/dal";
import { getDefaultRoom, getOwnTeacherProfile } from "@/lib/classes/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

const TABS = [
  { id: "you", label: "About you", href: "/teacher/profile" },
  { id: "academy", label: "Academy", href: "/teacher/profile?tab=academy" },
] as const;

export default async function TeacherProfilePage(props: PageProps<"/teacher/profile">) {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const tab = sp.tab === "academy" ? "academy" : "you";

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Profile</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">
          {tab === "you" ? "What students see about you next to your classes." : "The page your students see about your academy: who you are, where you teach and where to find you online."}
        </p>
      </header>

      <nav aria-label="Profile" className="grid w-full max-w-sm grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "flex h-9 items-center justify-center rounded-full text-[14px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              tab === t.id ? "bg-gold-soft font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "academy" ? <AcademyProfileSection userId={user.id} role={user.role} /> : <YouTab userId={user.id} role={user.role} fullName={user.fullName} />}
    </main>
  );
}

async function YouTab({ userId, role, fullName }: { userId: string; role: string; fullName: string | null }) {
  const [profile, room] = await Promise.all([getOwnTeacherProfile(userId), role === "teacher" ? getDefaultRoom(userId) : Promise.resolve(null)]);
  return (
    <>
      <div className="max-w-[760px]">
        {profile ? (
          <TeacherProfileForm initial={{ ...profile, name: profile.name || fullName || "" }} />
        ) : (
          <p className="text-muted-foreground">Your profile isn&apos;t available right now. Please try again in a few minutes.</p>
        )}
      </div>
      {role === "teacher" && <div className="max-w-[760px]"><DefaultRoomForm initial={room ?? { joinUrl: "", passcode: "" }} /></div>}
    </>
  );
}
