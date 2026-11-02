import { Construction } from "lucide-react";

import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { Card } from "@/components/ui/card";

export function RolePlaceholder({ title, name, body }: { title: string; name: string; body: string }) {
  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-8">
        <Logo href="/" />
        <SignOutButton compact />
      </header>
      <main className="mx-auto grid max-w-2xl gap-6 px-4 py-12 sm:px-8">
        <p className="text-sm font-medium text-muted-foreground">Hello {name}</p>
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <Card>
          <span className="grid size-12 place-items-center rounded-xl bg-gold-soft text-gold-ink">
            <Construction className="size-6" aria-hidden />
          </span>
          <p className="text-muted-foreground">{body}</p>
        </Card>
      </main>
    </div>
  );
}
