import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/dal";
import { homeForRole } from "@/lib/auth/roles";

export default async function Home(props: PageProps<"/">) {
  // If Supabase sends an email link to the bare site address (its "Site URL"
  // fallback), pass the one-time code on to the confirm handler.
  const sp = await props.searchParams;
  const code = typeof sp.code === "string" ? sp.code : null;
  if (code) redirect(`/auth/confirm?code=${encodeURIComponent(code)}&next=/dashboard`);

  const user = await getCurrentUser();
  redirect(user ? homeForRole(user.role) : "/login");
}
