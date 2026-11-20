"use client";

import { Camera } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { FormField } from "@/components/auth/form-field";
import { GoogleMark } from "@/components/auth/social-buttons";
import { Button } from "@/components/ui/button";
import { removeAvatar, updateFullName } from "@/lib/account/actions";
import { Section, SettingRow, FormButtons } from "./account-ui";
import type { AccountState } from "./use-account-state";

export function ProfileSection({ st }: { st: AccountState }) {
  const {
    editing,
    busy,
    name,
    setName,
    avatarUrl,
    setAvatarUrl,
    googleName,
    photo,
    fileRef,
    open,
    close,
    submit,
    pickPhoto,
    savePhoto,
    errorText,
  } = st;
  return (
    <>
      <Section title="Profile" description="How you appear to your teachers and classmates.">
        <SettingRow
          label="Photo"
          value={
            <span className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group relative rounded-full focus-visible:outline-2"
                aria-label={avatarUrl ? "Change photo" : "Add a photo"}
              >
                <Avatar name={name} url={photo?.preview ?? avatarUrl} className="size-16 text-xl" />
                <span className="absolute -right-0.5 -bottom-0.5 grid size-7 place-items-center rounded-full border-2 border-card bg-gold text-white transition-transform group-hover:scale-110">
                  <Camera className="size-3.5" aria-hidden />
                </span>
              </button>
              <span className="text-[13px]">
                {avatarUrl ? "Tap the photo to change it." : "Add a photo so your teacher can recognise you."}
              </span>
            </span>
          }
          editing={editing === "photo"}
          onEdit={avatarUrl ? () => open("photo") : undefined}
          editLabel="Edit photo"
        >
          <div className="grid gap-4">
            {photo ? (
              <p className="text-sm text-muted-foreground">This is how your new photo will look.</p>
            ) : (
              avatarUrl && <p className="text-sm text-muted-foreground">Change or remove your photo.</p>
            )}
            {errorText}
            <div className="flex flex-wrap gap-2">
              {photo ? (
                <Button onClick={savePhoto} disabled={busy}>
                  {busy ? "Saving…" : "Save photo"}
                </Button>
              ) : (
                <Button onClick={() => fileRef.current?.click()} disabled={busy}>
                  Choose a photo
                </Button>
              )}
              {!photo && avatarUrl && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    submit(async () => {
                      const r = await removeAvatar();
                      if ("ok" in r) setAvatarUrl(null);
                      return r;
                    }, "Your photo is removed.")
                  }
                >
                  Remove photo
                </Button>
              )}
              <Button variant="ghost" onClick={close} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        </SettingRow>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            void pickPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <SettingRow
          label="Name"
          value={
            <span className="grid justify-items-start gap-0.5">
              <span className="text-foreground">{name || "No name yet"}</span>
              {googleName && editing !== "name" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    submit(async () => {
                      const r = await updateFullName(googleName);
                      if ("ok" in r) setName(googleName);
                      return r;
                    }, "Your name is saved.")
                  }
                  className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-gold-ink underline-offset-4 hover:underline disabled:opacity-60 sm:min-h-8"
                >
                  <span className="[&_svg]:size-3.5" aria-hidden>
                    <GoogleMark />
                  </span>
                  Use &ldquo;{googleName}&rdquo; from Google
                </button>
              )}
            </span>
          }
          editing={editing === "name"}
          onEdit={() => open("name")}
          editLabel="Edit name"
        >
          <form
            className="grid max-w-md gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const value = String(new FormData(e.currentTarget).get("fullName") ?? "");
              submit(async () => {
                const r = await updateFullName(value);
                if ("ok" in r) setName(value.trim());
                return r;
              }, "Your name is saved.");
            }}
          >
            <FormField
              id="fullName"
              name="fullName"
              label="Full name"
              defaultValue={name}
              autoComplete="name"
              required
            />
            {errorText}
            <FormButtons busy={busy} onCancel={close} />
          </form>
        </SettingRow>
      </Section>
    </>
  );
}
