import Link from "next/link";
import { ArrowRight, GraduationCap, Users } from "lucide-react";

const ROLES = [
  { href: "/signup?as=student", icon: GraduationCap, title: "I’m a student", text: "Prepare for your German exam with practice, mock exams and feedback." },
  { href: "/signup?as=teacher", icon: Users, title: "I’m a teacher or school", text: "Run classes, homework and tests for your own students. Free to start." },
] as const;

/** First screen of signup: who are you? Students and teachers/schools sign up on their own. */
export function RoleChoice() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-2 text-center">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Welcome to Deutli</h1>
        <p className="text-[15px] text-muted-foreground">Which describes you best?</p>
      </div>
      <div className="grid gap-4">
        {ROLES.map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="group grid gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-gold-ink/60 hover:bg-muted/40">
            <span aria-hidden className="grid size-12 place-items-center rounded-full bg-gold-soft text-gold-ink">
              <Icon className="size-6" />
            </span>
            <span className="grid gap-1">
              <span className="flex items-center gap-2 text-xl font-bold">
                {title}
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
              <span className="text-[14px] text-muted-foreground">{text}</span>
            </span>
          </Link>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="py-3 font-semibold text-foreground underline underline-offset-4 hover:text-gold-ink">
          Log in
        </Link>
      </p>
    </div>
  );
}
