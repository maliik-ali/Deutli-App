"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { signInWithProvider, type SocialProvider } from "@/app/(auth)/actions";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}

/** "Continue with Google" for the login and signup pages. */
export function SocialButtons() {
  const [pending, start] = useTransition();
  const [which, setWhich] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  function go(provider: SocialProvider) {
    setError(null);
    setWhich(provider);
    start(async () => {
      const r = await signInWithProvider(provider);
      if (r?.error) {
        setError(r.error);
        setWhich(null);
      }
    });
  }

  const busy = (p: SocialProvider) => pending && which === p;
  return (
    <div className="grid gap-4">
      <FormError message={error} />
      <div className="grid gap-3">
        <Button type="button" variant="outline" size="lg" className="w-full" disabled={pending} onClick={() => go("google")}>
          {busy("google") ? <Loader2 className="animate-spin" aria-hidden /> : <GoogleMark />} Continue with Google
        </Button>
      </div>
      <div className="flex items-center gap-3 text-[13px] text-subtle-foreground" role="separator" aria-label="or">
        <span className="h-px flex-1 bg-border" />
        or use your email
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
