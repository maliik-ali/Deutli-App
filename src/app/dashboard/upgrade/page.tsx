import type { Metadata } from "next";
import { Check } from "lucide-react";

import { ProRequest } from "@/components/dashboard/pro-request";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Deutli Pro" };

const FREE = ["The free Hamburg mock exam, marked on screen", "Daily Practice: listen, read, speak along", "Vocabulary with meanings in your languages", "AI estimate for your writing"];
const PRO = ["More full telc B1 mock exams", "Teacher-checked writing", "Everything in Free"];

export default async function UpgradePage() {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const supabase = await createClient();
  const { data } = await supabase.from("pro_requests").select("user_id").eq("user_id", user.id).maybeSingle();

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Deutli Pro</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">Online payment is not open yet. Tell us you are interested and we will contact you with the price and how to pay.</p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <div className="grid gap-1">
            <CardTitle>Free</CardTitle>
            <CardDescription>What you have now</CardDescription>
          </div>
          <ul className="grid gap-2.5">
            {FREE.map((t) => (
              <li key={t} className="flex gap-2 text-[15px]">
                <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="border-gold-ink/60">
          <div className="grid gap-1">
            <CardTitle>Pro</CardTitle>
            <CardDescription>Price shared by the academy</CardDescription>
          </div>
          <ul className="grid gap-2.5">
            {PRO.map((t) => (
              <li key={t} className="flex gap-2 text-[15px]">
                <Check className="mt-0.5 size-4 shrink-0 text-gold-ink" aria-hidden /> {t}
              </li>
            ))}
          </ul>
          <ProRequest already={!!data} />
        </Card>
      </div>
    </main>
  );
}
