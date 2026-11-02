import { requireUser } from "@/lib/auth/dal";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardPage() {
  const user = await requireUser(["student"]);
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Hallo, {user.fullName}</h1>
      <SignOutButton compact />
    </main>
  );
}
