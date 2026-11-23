"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Send } from "lucide-react";

import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteTeacher } from "@/lib/teachers/actions";

/** Admin: send a teacher an email invite. They choose a password and arrive in the teacher area. */
export function InviteTeacher() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSentTo(null);
    start(async () => {
      const r = await inviteTeacher({ name, email });
      if ("error" in r) return setError(r.error);
      setSentTo(email.trim().toLowerCase());
      setName("");
      setEmail("");
      router.refresh();
    });
  }

  return (
    <Card>
      <div className="grid gap-1">
        <CardTitle className="text-lg">Invite a teacher</CardTitle>
        <CardDescription>They get an email, choose a password, and start in their own teacher workspace. No need to sign up first.</CardDescription>
      </div>
      <form onSubmit={send} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
        <div className="grid gap-2">
          <Label htmlFor="invite-name">Name</Label>
          <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="off" placeholder="e.g. Anna Schmidt" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" placeholder="teacher@example.com" />
        </div>
        <Button type="submit" disabled={pending || !name.trim() || !email.trim()}>
          <Send aria-hidden /> {pending ? "Sending…" : "Send invite"}
        </Button>
      </form>
      <FormError message={error} />
      {sentTo && (
        <p role="status" className="flex items-start gap-2 text-[14px] font-medium">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
          Invite sent to {sentTo}. They show in the list below as a teacher.
        </p>
      )}
    </Card>
  );
}
