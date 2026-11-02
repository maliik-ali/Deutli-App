import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-start justify-center gap-6 px-6">
      <Logo />
      <h1 className="text-4xl font-extrabold">
        Pass your German B1 — with AI and a real teacher.
      </h1>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/signup">Create account</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    </main>
  );
}
