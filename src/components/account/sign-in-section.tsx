"use client";

import { FormField } from "@/components/auth/form-field";
import { PasswordStrength } from "@/components/auth/password-strength";
import { GoogleMark } from "@/components/auth/social-buttons";
import { changePassword, requestEmailChange, updatePhone } from "@/lib/account/actions";
import { Section, SettingRow, FormButtons } from "./account-ui";
import type { AccountInfo } from "./account-types";
import type { AccountState } from "./use-account-state";

export function SignInSection({ info, st }: { info: AccountInfo; st: AccountState }) {
  const {
    editing,
    setEditing,
    setError,
    setNotice,
    busy,
    startBusy,
    phone,
    setPhone,
    pendingEmail,
    setPendingEmail,
    newPassword,
    setNewPassword,
    open,
    close,
    submit,
    errorText,
  } = st;
  return (
    <>
      <Section title="Sign-in and contact" description="Your email, phone number and password.">
        <SettingRow
          label="Email"
          value={
            <span className="grid gap-0.5">
              <span className="break-all text-foreground">{info.email}</span>
              {info.signIn.google ? (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-0.5 text-[12px] font-semibold text-success">
                  <span className="grid size-4 place-items-center rounded-full bg-white [&_svg]:size-3">
                    <GoogleMark />
                  </span>
                  Google connected
                </span>
              ) : (
                <span className="inline-flex w-fit items-center rounded-full bg-muted px-2.5 py-0.5 text-[12px] font-semibold text-muted-foreground">
                  Manual
                </span>
              )}
              {pendingEmail && (
                <span className="text-[13px]">
                  Waiting for you to confirm <span className="break-all text-foreground">{pendingEmail}</span>. Open
                  the link we emailed you (and the one sent to your current email, if you got one).
                </span>
              )}
            </span>
          }
          editing={editing === "email"}
          onEdit={() => open("email")}
          editLabel="Change email"
        >
          <form
            className="grid max-w-md gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const value = String(new FormData(e.currentTarget).get("newEmail") ?? "");
              setError(null);
              startBusy(async () => {
                const r = await requestEmailChange(value);
                if ("error" in r) {
                  setError(r.error);
                  return;
                }
                setPendingEmail(r.sentTo);
                setEditing(null);
                setNotice(`We sent a link to ${r.sentTo}. Your email changes once you open it.`);
              });
            }}
          >
            <FormField
              id="newEmail"
              name="newEmail"
              type="email"
              label="New email"
              autoComplete="email"
              defaultValue={pendingEmail ?? ""}
              hint="We'll send a link to this address. Your email only changes after you open it."
              required
            />
            {errorText}
            <FormButtons busy={busy} onCancel={close} label="Send link" />
          </form>
        </SettingRow>

        <SettingRow
          label="Phone"
          value={phone ? <span className="text-foreground">{phone}</span> : "No number added"}
          editing={editing === "phone"}
          onEdit={() => open("phone")}
          editLabel="Edit phone number"
        >
          <form
            className="grid max-w-md gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const value = String(new FormData(e.currentTarget).get("phone") ?? "");
              submit(async () => {
                const r = await updatePhone(value);
                if ("ok" in r) setPhone(value.trim());
                return r;
              }, "Your phone number is saved.");
            }}
          >
            <FormField
              id="phone"
              name="phone"
              type="tel"
              label="Phone number"
              optional
              defaultValue={phone}
              autoComplete="tel"
              placeholder="+92 300 1234567"
            />
            {errorText}
            <FormButtons busy={busy} onCancel={close} />
          </form>
        </SettingRow>

        <SettingRow
          label="Password"
          value={
            info.signIn.password ? (
              <span aria-label="Password hidden">••••••••</span>
            ) : (
              "No password set. You log in with Google."
            )
          }
          editing={editing === "password"}
          onEdit={info.signIn.password ? () => open("password") : undefined}
          editLabel="Change password"
        >
          <form
            className="grid max-w-md gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const input = {
                currentPassword: String(f.get("currentPassword") ?? ""),
                password: String(f.get("password") ?? ""),
                confirmPassword: String(f.get("confirmPassword") ?? ""),
              };
              submit(() => changePassword(input), "Your password is changed.");
            }}
          >
            <FormField
              id="currentPassword"
              name="currentPassword"
              type="password"
              label="Current password"
              autoComplete="current-password"
              required
            />
            <FormField
              id="password"
              name="password"
              type="password"
              label="New password"
              autoComplete="new-password"
              hint={<PasswordStrength password={newPassword} />}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <FormField
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label="Type the new password again"
              autoComplete="new-password"
              required
            />
            {errorText}
            <FormButtons busy={busy} onCancel={close} label="Change password" />
          </form>
        </SettingRow>
      </Section>
    </>
  );
}
