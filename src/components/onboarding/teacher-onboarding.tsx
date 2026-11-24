"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Copy } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { FormError } from "@/components/auth/form-error";
import { FormField } from "@/components/auth/form-field";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { createMyWorkspace } from "@/lib/teachers/self-signup";
import { ACCOUNT_TYPES, EXAMS, LEVELS, STUDENT_COUNTS, TOOLS, WANTS, type TeacherSignupInput } from "@/lib/teachers/signup-options";
import { cn } from "@/lib/utils";
import { Choice, Heading } from "./onboarding-ui";

const STEPS = 3;
type Ready = { name: string; code: string | null; link: string | null };

/** A small selectable pill: pick one ("radio") or several ("check"). */
function Chip({ selected, kind, onClick, children }: { selected: boolean; kind: "radio" | "check"; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role={kind === "radio" ? "radio" : "checkbox"}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[14px] font-semibold transition-colors",
        selected ? "border-gold-ink bg-gold-soft text-foreground" : "border-border text-muted-foreground hover:border-gold-ink/60 hover:text-foreground",
      )}
    >
      {selected && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
      {children}
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3" role="group" aria-label={title}>
      <p className="text-[15px] font-semibold">{title}</p>
      <div className="flex flex-wrap gap-2.5">{children}</div>
    </div>
  );
}

const toggle = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function TeacherOnboarding({ defaultName, email }: { defaultName: string; email: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState<Ready | null>(null);
  const [copied, setCopied] = useState(false);

  const [accountType, setAccountType] = useState<TeacherSignupInput["accountType"] | null>(null);
  const [name, setName] = useState(defaultName);
  const [exams, setExams] = useState<TeacherSignupInput["exams"]>([]);
  const [levels, setLevels] = useState<TeacherSignupInput["levels"]>([]);
  const [studentCount, setStudentCount] = useState<TeacherSignupInput["studentCount"]>(null);
  const [tools, setTools] = useState<TeacherSignupInput["tools"]>([]);
  const [wants, setWants] = useState<TeacherSignupInput["wants"]>([]);

  const nameOk = name.trim().length >= 2;
  const canContinue = step === 0 ? accountType !== null : step === 1 ? nameOk : true;
  const missing = step === 0 ? "Choose one to continue." : "Enter your name or your school's name to continue.";

  function create() {
    if (!accountType) return;
    setError(null);
    start(async () => {
      const r = await createMyWorkspace({ accountType, name, exams, levels, studentCount, tools, wants });
      if ("error" in r) setError(r.error);
      else setReady({ name: r.name, code: r.code, link: r.link });
    });
  }

  async function copy() {
    if (!ready?.link) return;
    try {
      await navigator.clipboard.writeText(ready.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Copying is a convenience; the code is on screen. */
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto grid h-16 w-full max-w-[1040px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 sm:px-6">
          <div className="flex items-center gap-1">
            {!ready && step > 0 && (
              <Button variant="ghost" size="icon" onClick={() => setStep(step - 1)} aria-label="Back">
                <ArrowLeft className="size-5" aria-hidden />
              </Button>
            )}
            <Logo href="/" className={cn("px-1", step > 0 && "max-sm:[&>span]:hidden")} />
          </div>
          {!ready && (
            <div className="flex items-center gap-1.5" role="progressbar" aria-label="Questions" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step + 1} aria-valuetext={`Step ${step + 1} of ${STEPS}`}>
              {Array.from({ length: STEPS }, (_, i) => (
                <span key={i} className={cn("h-2 rounded-full transition-all", i === step ? "w-8 bg-brand-gradient" : "w-2", i < step ? "bg-gold" : i > step && "bg-border")} />
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[640px] content-start gap-8 px-4 py-8 sm:px-6 sm:py-12">
        {ready ? (
          <>
            <Heading title="Your workspace is ready" text="Share this code with your students. They join your workspace when they sign up." />
            <div className="grid gap-4 rounded-2xl border border-border bg-ink p-5 text-ink-foreground sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-bold">{ready.name}</p>
                <span className="rounded-full bg-gold-soft px-3 py-1 text-[13px] font-semibold text-gold-ink">Free plan</span>
              </div>
              <p className="text-[14px] text-muted-foreground">Up to 5 active students · homework, live classes and mock exams</p>
              {ready.code && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <div>
                    <p className="text-[12px] font-semibold text-subtle-foreground">Your join code</p>
                    <p className="text-[22px] font-extrabold tracking-[0.12em]">{ready.code}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={copy}>
                    {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy link"}
                  </Button>
                </div>
              )}
            </div>
            <div className="grid justify-items-center">
              <Button
                className="h-12 text-base"
                onClick={() => {
                  router.push("/teacher");
                  router.refresh();
                }}
              >
                Go to my workspace <ArrowRight aria-hidden />
              </Button>
            </div>
          </>
        ) : (
          <>
            {step === 0 && (
              <>
                <Heading title="How do you teach?" text="Pick the one that fits today. You can switch later and keep your students." />
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="How do you teach?">
                  {ACCOUNT_TYPES.map((t) => (
                    <Choice key={t.id} kind="radio" selected={accountType === t.id} onClick={() => setAccountType(t.id)} className="items-start">
                      <span className="block font-bold">{t.title}</span>
                      <span className="mt-1 block text-[14px] text-muted-foreground">{t.text}</span>
                    </Choice>
                  ))}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <Heading title="Tell us about your teaching" text="We use this to set up your workspace. It takes a minute." />
                <div className="grid gap-7">
                  <FormField id="workspace-name" label={accountType === "school" ? "School or academy name" : "Your name or class name"} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={accountType === "school" ? "Berlin German Academy" : "Frau Schneider German Classes"} autoComplete="organization" />
                  <Group title="Which exams do you prepare students for?">
                    {EXAMS.map((x) => (
                      <Chip key={x.id} kind="check" selected={exams.includes(x.id)} onClick={() => setExams(toggle(exams, x.id))}>{x.label}</Chip>
                    ))}
                  </Group>
                  <Group title="Which levels?">
                    {LEVELS.map((l) => (
                      <Chip key={l} kind="check" selected={levels.includes(l)} onClick={() => setLevels(toggle(levels, l))}>{l}</Chip>
                    ))}
                  </Group>
                  <Group title="How many students do you teach now?">
                    {STUDENT_COUNTS.map((c) => (
                      <Chip key={c.id} kind="radio" selected={studentCount === c.id} onClick={() => setStudentCount(c.id)}>{c.label}</Chip>
                    ))}
                  </Group>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <Heading title="What would help you most?" text="Pick as many as you like. We will switch on the right tools first." />
                <div className="grid gap-7">
                  <Group title="How do you teach today?">
                    {TOOLS.map((x) => (
                      <Chip key={x.id} kind="check" selected={tools.includes(x.id)} onClick={() => setTools(toggle(tools, x.id))}>{x.label}</Chip>
                    ))}
                  </Group>
                  <Group title="What do you want from Deutli?">
                    {WANTS.map((x) => (
                      <Chip key={x.id} kind="check" selected={wants.includes(x.id)} onClick={() => setWants(toggle(wants, x.id))}>{x.label}</Chip>
                    ))}
                  </Group>
                </div>
              </>
            )}

            <FormError message={error} />
            <div className="grid justify-items-center gap-2">
              {step < STEPS - 1 ? (
                <Button className="h-12 text-base" disabled={!canContinue} aria-describedby={canContinue ? undefined : "continue-hint"} onClick={() => setStep(step + 1)}>
                  Continue <ArrowRight aria-hidden />
                </Button>
              ) : (
                <Button className="h-12 text-base" disabled={pending} onClick={create}>
                  {pending ? "Creating…" : "Create my workspace"} <ArrowRight aria-hidden />
                </Button>
              )}
              {!canContinue && <p id="continue-hint" className="text-[13px] text-subtle-foreground">{missing}</p>}
              {step === 0 && (
                <form action={signOut}>
                  <button type="submit" title={email ? `Signed in as ${email}` : undefined} className="inline-flex min-h-11 items-center px-2 text-[13px] text-subtle-foreground underline-offset-4 hover:text-foreground hover:underline">
                    Not you? Log out
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
