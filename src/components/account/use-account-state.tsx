"use client";

import { useRef, useState, useTransition } from "react";
import { squarePhoto } from "@/lib/account/photo-crop";
import { uploadAvatar, type AccountResult } from "@/lib/account/actions";
import type { AccountInfo, Row } from "./account-types";

export function useAccountState(info: AccountInfo) {
  const [editing, setEditing] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const [name, setName] = useState(info.fullName);
  const [phone, setPhone] = useState(info.phone);
  const [pendingEmail, setPendingEmail] = useState(info.pendingEmail);
  const [languages, setLanguages] = useState(info.languages);
  const [draftLanguages, setDraftLanguages] = useState(info.languages);
  const [newPassword, setNewPassword] = useState("");
  const [timeZone, setTimeZone] = useState(info.timeZone);
  const [draftTimeZone, setDraftTimeZone] = useState(info.timeZone);
  const [avatarUrl, setAvatarUrl] = useState(info.avatarUrl);
  const [confirmText, setConfirmText] = useState("");
  // Offer the Google name with one tap when it differs from the saved name.
  const googleName =
    info.signIn.google?.name && info.signIn.google.name.toLowerCase() !== name.trim().toLowerCase()
      ? info.signIn.google.name
      : null;
  const [photo, setPhoto] = useState<{ blob: Blob; preview: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function open(row: Row) {
    setEditing(row);
    setError(null);
    setNotice(null);
    setDraftLanguages(languages);
    setDraftTimeZone(timeZone);
    setNewPassword("");
  }
  function close() {
    setEditing(null);
    setError(null);
    if (photo) URL.revokeObjectURL(photo.preview);
    setPhoto(null);
  }
  function submit(run: () => Promise<AccountResult | { error: string } | object>, done: string) {
    setError(null);
    startBusy(async () => {
      const result = await run();
      if ("error" in result) {
        setError(result.error as string);
        return;
      }
      setEditing(null);
      setNotice(done);
    });
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);
    if (!file.type.startsWith("image/")) {
      setEditing("photo");
      setError("Please choose a photo (JPG, PNG or WebP).");
      return;
    }
    try {
      const blob = await squarePhoto(file);
      if (photo) URL.revokeObjectURL(photo.preview);
      setPhoto({ blob, preview: URL.createObjectURL(blob) });
      setEditing("photo");
    } catch {
      setEditing("photo");
      setError("We couldn't open that photo. Try a JPG or PNG.");
    }
  }

  function savePhoto() {
    if (!photo) return;
    const form = new FormData();
    form.append("photo", photo.blob, "photo.jpg");
    submit(async () => {
      const r = await uploadAvatar(form);
      if ("url" in r) {
        setAvatarUrl(r.url || photo.preview);
        setPhoto(null);
      }
      return r;
    }, "Your photo is saved.");
  }

  const errorText = error && (
    <p className="text-sm text-destructive" role="alert">
      {error}
    </p>
  );

  return {
    editing,
    setEditing,
    error,
    setError,
    notice,
    setNotice,
    busy,
    startBusy,
    name,
    setName,
    phone,
    setPhone,
    pendingEmail,
    setPendingEmail,
    languages,
    setLanguages,
    draftLanguages,
    setDraftLanguages,
    newPassword,
    setNewPassword,
    timeZone,
    setTimeZone,
    draftTimeZone,
    setDraftTimeZone,
    avatarUrl,
    setAvatarUrl,
    confirmText,
    setConfirmText,
    googleName,
    photo,
    setPhoto,
    fileRef,
    open,
    close,
    submit,
    pickPhoto,
    savePhoto,
    errorText,
  };
}

export type AccountState = ReturnType<typeof useAccountState>;
