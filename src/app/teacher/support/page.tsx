import type { Metadata } from "next";

import { SupportView, type Faq } from "@/components/support/support-view";
import { requireUser } from "@/lib/auth/dal";
import { FEEDBACK_KINDS, type FeedbackKind } from "@/lib/support/contact";

export const metadata: Metadata = { title: "Support" };

const FAQ: Faq = [
  { q: "How do my students join?", a: "Give them your join code, link or QR from the teacher dashboard. They enter it when they sign up, or under Account → Join a teacher or school." },
  { q: "How do I change my plan?", a: "We set up plan changes for you for now. Send us a message here or on WhatsApp and tell us which plan you want." },
  { q: "What happens when I reach my student limit?", a: "Students who are already in stay in. You can't add new students until the plan is upgraded." },
  { q: "How do I delete my account?", a: "Your students, classes and workspace depend on your account, so we remove teacher accounts for you. Send us a message and we will help." },
];

const isKind = (v: unknown): v is FeedbackKind => FEEDBACK_KINDS.some((k) => k.id === v);

export default async function TeacherSupportPage(props: PageProps<"/teacher/support">) {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const kind = isKind(sp.kind) ? sp.kind : "question";
  const from = typeof sp.from === "string" && /^\/[^\s]{0,199}$/.test(sp.from) ? sp.from : "/teacher/support";
  return <SupportView userId={user.id} timeZone={user.timeZone} kind={kind} from={from} faq={FAQ} />;
}
