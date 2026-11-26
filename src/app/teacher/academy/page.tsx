import { redirect } from "next/navigation";

// The academy profile now lives on the Profile page (second tab). This keeps old links working.
export default function AcademyProfileRedirect() {
  redirect("/teacher/profile?tab=academy");
}
