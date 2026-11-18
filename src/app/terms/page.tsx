import { redirect } from "next/navigation";

// The full, up-to-date legal text lives on the website, so the app and the website never disagree.
export default function Page() {
  redirect("https://www.deutli.com/terms");
}
