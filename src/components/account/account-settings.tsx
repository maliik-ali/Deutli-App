"use client";

import { CheckCircle2 } from "lucide-react";

import type { AccountInfo } from "./account-types";
import { LEGAL_LINKS } from "./account-ui";
import { DeleteAccountSection } from "./delete-section";
import { LearningSection } from "./learning-section";
import { PlanSection } from "./plan-section";
import { ProfileSection } from "./profile-section";
import { SignInSection } from "./sign-in-section";
import { useAccountState } from "./use-account-state";

export type { AccountInfo } from "./account-types";

export function AccountSettings({ info }: { info: AccountInfo }) {
  const st = useAccountState(info);
  const { notice } = st;

  return (
    <div className="grid gap-6">
      {notice && (
        <p
          className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success"
          role="status"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden /> {notice}
        </p>
      )}

      <ProfileSection st={st} />
      <PlanSection info={info} />
      <SignInSection info={info} st={st} />
      <LearningSection st={st} />
      <DeleteAccountSection info={info} st={st} />

      <nav aria-label="Legal" className="flex flex-wrap gap-x-5 px-1 text-[13px] text-subtle-foreground">
        {LEGAL_LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
          >
            {l.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
