import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Friendly empty state: owl, one sentence, one clear next step. */
export function ClassesEmpty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="grid justify-items-center gap-3 px-6 py-12 text-center">
      <Image src="/deutli-owl.png" alt="" width={56} height={59} className="h-14 w-auto opacity-90" />
      <h2 className="text-[17px] font-bold">{title}</h2>
      <p className="max-w-sm text-[15px] text-muted-foreground">{body}</p>
      {action && (
        <Button asChild variant="outline" className="mt-1">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
