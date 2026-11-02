import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NAV_ITEMS } from "@/lib/sample-data";

export default async function SectionPage(props: PageProps<"/dashboard/[section]">) {
  const { section } = await props.params;
  const item = NAV_ITEMS.find((i) => i.href === `/dashboard/${section}`);
  if (!item) notFound();

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <h1 className="text-[28px] font-extrabold sm:text-[32px]">{item.label}</h1>
      <Card className="items-center py-14 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-gold-soft text-gold-ink">
          <Sparkles className="size-7" aria-hidden />
        </span>
        <div className="grid gap-2">
          <h2 className="text-lg font-bold">Coming soon</h2>
          <p className="max-w-sm text-muted-foreground">
            We&apos;re building this part of your B1 course. For now, keep your streak going from the dashboard.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </Card>
    </main>
  );
}
