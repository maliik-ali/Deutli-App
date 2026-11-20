import type { Metadata } from "next";

import { Mail, MessageCircle } from "lucide-react";

import { SocialLinks } from "@/components/support/social-links";
import { SupportForm } from "@/components/support/support-form";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { FEEDBACK_KINDS, SUPPORT, whatsappLink, type FeedbackKind } from "@/lib/support/contact";

export const metadata: Metadata = { title: "Support" };

const FAQ = [
  { q: "How does Pro work?", a: "You pay once, in advance, for 1, 3 or 12 months. Nothing renews automatically. If you buy again before it ends, the new months are added after the days you have left." },
  { q: "How do I pay by bank, JazzCash or EasyPaisa?", a: "On the plans page choose “Pay with a bank or wallet instead”. Send the amount, then enter your transaction ID. We check it, usually within one working day, and turn Pro on." },
  { q: "I paid but Pro is not on.", a: "Card payments take a few seconds, so refresh the page. For a bank or wallet payment, we have to check it first. If it takes longer, send us a Payment message with your order reference." },
  { q: "How do I delete my account?", a: "Open Account, scroll to “Delete account” and follow the steps." },
] as const;

const STATUS: Record<string, string> = { new: "Received", in_progress: "We are on it", done: "Done" };
const KIND_LABEL = Object.fromEntries(FEEDBACK_KINDS.map((k) => [k.id, k.label]));
const isKind = (v: unknown): v is FeedbackKind => FEEDBACK_KINDS.some((k) => k.id === v);

export default async function SupportPage(props: PageProps<"/dashboard/support">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const kind = isKind(sp.kind) ? sp.kind : "question";
  // Where the student came from (a path inside the app), so we can see where it happened.
  const from = typeof sp.from === "string" && /^\/[^\s]{0,199}$/.test(sp.from) ? sp.from : "/dashboard/support";

  const supabase = await createClient();
  const { data } = await supabase.from("feedback").select("id, kind, message, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
  const mine = (data ?? []) as { id: string; kind: string; message: string; status: string; created_at: string }[];

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Support</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">Questions, problems or ideas? Send us a message or write to us directly. We read every message.</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <SupportForm initialKind={kind} from={from} />

          <Card className="gap-1 pb-2">
            <CardTitle className="text-lg">Your messages</CardTitle>
            {mine.length === 0 ? (
              <CardDescription className="py-3">Nothing sent yet.</CardDescription>
            ) : (
              <ul className="divide-y divide-border">
                {mine.map((m) => (
                  <li key={m.id} className="grid gap-1 py-3">
                    <p className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted-foreground">
                      <span>
                        {KIND_LABEL[m.kind] ?? m.kind} · {new Date(m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: user.timeZone })}
                      </span>
                      <span className="rounded-full border border-border px-2.5 py-0.5 text-[12px] font-semibold text-foreground">{STATUS[m.status] ?? m.status}</span>
                    </p>
                    <p className="line-clamp-3 text-[15px] whitespace-pre-wrap">{m.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid gap-6">
          <Card className="gap-4">
            <div className="grid gap-1">
              <CardTitle className="text-lg">Write to us</CardTitle>
              <CardDescription>The quickest way is WhatsApp.</CardDescription>
            </div>
            <Button asChild size="lg">
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden /> WhatsApp {SUPPORT.whatsappDisplay}
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={`mailto:${SUPPORT.email}`}>
                <Mail aria-hidden /> {SUPPORT.email}
              </a>
            </Button>
            <SocialLinks />
          </Card>

          <Card className="gap-2">
            <CardTitle className="text-lg">Quick answers</CardTitle>
            <div className="divide-y divide-border">
              {FAQ.map((f) => (
                <details key={f.q} className="group py-1">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="pb-3 text-[14px] leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
