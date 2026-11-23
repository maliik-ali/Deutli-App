import type { Metadata } from "next";

import { AccountView } from "@/components/account/account-view";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Account" };

export default async function AdminAccountPage() {
  const user = await requireUser(["academy_admin", "super_admin"]);
  return (
    <main className="mx-auto grid max-w-[960px] gap-6 px-4 py-8 sm:px-8">
      <AccountView user={user} />
    </main>
  );
}
