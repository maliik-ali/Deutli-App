import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { AuthHeading } from "@/components/auth/auth-heading";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Check your email" };

export default async function CheckEmailPage(props: PageProps<"/check-email">) {
  const sp = await props.searchParams;
  const isReset = sp.type === "reset";
  const email = typeof sp.email === "string" ? sp.email.slice(0, 200) : null;

  return (
    <div className="grid gap-8">
      <span className="grid size-14 place-items-center rounded-2xl bg-gold-soft text-gold-ink">
        <MailCheck className="size-7" aria-hidden />
      </span>
      <AuthHeading
        title="Check your email"
        subtitle={
          <>
            {isReset ? "If an account exists for " : "We sent a confirmation link to "}
            <span className="font-medium text-foreground">{email ?? "your email address"}</span>
            {isReset
              ? ", you'll get a link to choose a new password."
              : ". Open it to activate your account."}
          </>
        }
      />
      <ul className="grid gap-2 rounded-2xl border border-border bg-background p-5 text-sm text-muted-foreground">
        <li>• The email can take a minute to arrive.</li>
        <li>• Check your spam or promotions folder.</li>
        <li>• Open the link on this device, in this browser.</li>
      </ul>
      <div className="grid gap-3">
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Back to log in</Link>
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Wrong email?{" "}
          <Link
            href={isReset ? "/forgot-password" : "/signup"}
            className="font-semibold text-foreground underline underline-offset-4 hover:text-gold-ink"
          >
            Try again
          </Link>
        </p>
      </div>
    </div>
  );
}
