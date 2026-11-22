"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveDefaultRoom } from "@/lib/classes/actions";

/** One saved room link (Zoom, Meet…). New classes start with it, so you never re-send links. */
export function DefaultRoomForm({ initial }: { initial: { joinUrl: string; passcode: string } }) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  return (
    <Card>
      <div className="grid gap-1">
        <CardTitle>My class room</CardTitle>
        <CardDescription>Your usual meeting link. New classes start with it. Students only see it after they register, 10 minutes before a class starts.</CardDescription>
      </div>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); setMsg(null); start(async () => { const r = await saveDefaultRoom(v); setMsg("error" in r ? { ok: false, text: r.error } : { ok: true, text: "Saved." }); }); }}>
        <label className="grid gap-1.5 text-[13px] font-medium text-muted-foreground">Room link<Input type="url" inputMode="url" value={v.joinUrl} onChange={(e) => setV({ ...v, joinUrl: e.target.value })} placeholder="https://zoom.us/j/123456789" maxLength={500} /></label>
        <label className="grid gap-1.5 text-[13px] font-medium text-muted-foreground">Passcode (optional)<Input value={v.passcode} onChange={(e) => setV({ ...v, passcode: e.target.value })} maxLength={40} className="sm:max-w-xs" autoComplete="off" /></label>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          {msg && <p role={msg.ok ? "status" : "alert"} className={`text-[13px] ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>}
        </div>
      </form>
    </Card>
  );
}
