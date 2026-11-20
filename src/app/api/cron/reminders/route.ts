import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { runReminders } from "@/lib/reminders/run";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Called every 10 minutes by Supabase (pg_cron). Sends the Pro-ending and class-starting reminders.
 * Only a caller that knows CRON_SECRET may run it; anyone else gets 401 and nothing happens.
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const admin = createAdminClient();
  if (!secret || !admin) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${secret}`);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, sent: await runReminders(admin) });
}

export const GET = handle;
export const POST = handle;
