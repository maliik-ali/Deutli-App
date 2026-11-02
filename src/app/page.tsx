import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/dal";
import { homeForRole } from "@/lib/auth/roles";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? homeForRole(user.role) : "/login");
}
