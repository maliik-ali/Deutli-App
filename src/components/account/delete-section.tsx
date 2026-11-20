"use client";

import { FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { deleteMyAccount } from "@/lib/account/actions";
import type { AccountInfo } from "./account-types";
import type { AccountState } from "./use-account-state";

export function DeleteAccountSection({ info, st }: { info: AccountInfo; st: AccountState }) {
  const {
    editing,
    setError,
    busy,
    startBusy,
    confirmText,
    setConfirmText,
    open,
    close,
    errorText,
  } = st;
  return (
    <>
      {info.canDelete && (
        <form
          aria-labelledby="delete-account-title"
          className="overflow-hidden rounded-2xl border border-destructive/40 bg-card"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startBusy(async () => {
              const r = await deleteMyAccount(confirmText);
              if (r && "error" in r) setError(r.error);
            });
          }}
        >
          <div className="grid gap-5 p-6">
            <div className="grid gap-1">
              <CardTitle id="delete-account-title" className="text-lg">
                Delete account
              </CardTitle>
              <CardDescription>
                Permanently delete your Deutli account with your profile, progress, saved words and exam results.
              </CardDescription>
            </div>
            {editing === "delete" && (
              <div className="grid max-w-md gap-4 border-t border-border pt-5">
                <p className="text-sm text-muted-foreground">
                  You&apos;ll be logged out and can&apos;t get your data back. Payment records are kept without your
                  name, because the law requires it.
                </p>
                <FormField
                  id="confirmDelete"
                  name="confirmDelete"
                  label="Type DELETE to confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  autoFocus
                  required
                />
                {errorText}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-destructive/30 bg-destructive-soft/60 px-6 py-4">
            {editing === "delete" ? (
              <>
                <Button type="button" variant="ghost" onClick={close} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="ink"
                  disabled={busy || confirmText.trim().toUpperCase() !== "DELETE"}
                  className="bg-destructive font-semibold text-background hover:bg-destructive/90"
                >
                  {busy ? "Deleting…" : "Delete my account"}
                </Button>
              </>
            ) : (
              <>
                <p className="mr-auto text-[13px] text-muted-foreground">This can&apos;t be undone.</p>
                <Button
                  type="button"
                  variant="ink"
                  onClick={() => {
                    setConfirmText("");
                    open("delete");
                  }}
                  className="bg-destructive font-semibold text-background hover:bg-destructive/90"
                >
                  Delete account
                </Button>
              </>
            )}
          </div>
        </form>
      )}
    </>
  );
}
