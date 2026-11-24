import type { Metadata } from "next";

import { SupportView, type Faq } from "@/components/support/support-view";
import { requireUser } from "@/lib/auth/dal";
import { FEEDBACK_KINDS, type FeedbackKind } from "@/lib/support/contact";

export const metadata: Metadata = { title: "Support" };

const FAQ: Faq = [
  { q: "How does Pro work?", a: "You pay once, in advance, for 1, 3 or 12 months. Nothing renews automatically. If you buy again before it ends, the new months are added after the days you have left." },
  { q: "How do I pay by bank, JazzCash or EasyPaisa?", a: "On the plans page choose “Pay with a bank or wallet instead”. Send the amount, then enter your transaction ID. We check it, usually within one working day, and turn Pro on." },
  { q: "I paid but Pro is not on.", a: "Card payments take a few seconds, so refresh the page. For a bank or wallet payment, we have to check it first. If it takes longer, send us a Payment message with your order reference." },
  { q: "How do I delete my account?", a: "Open Account, scroll to “Delete account” and follow the steps." },
];

const isKind = (v: unknown): v is FeedbackKind => FEEDBACK_KINDS.some((k) => k.id === v);

export default async function SupportPage(props: PageProps<"/dashboard/support">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const kind = isKind(sp.kind) ? sp.kind : "question";
  // Where the student came from (a path inside the app), so we can see where it happened.
  const from = typeof sp.from === "string" && /^\/[^\s]{0,199}$/.test(sp.from) ? sp.from : "/dashboard/support";
  return <SupportView userId={user.id} timeZone={user.timeZone} kind={kind} from={from} faq={FAQ} />;
}
