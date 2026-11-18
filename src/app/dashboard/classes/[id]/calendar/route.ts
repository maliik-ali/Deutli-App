import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** A calendar file (.ics) for a class the student registered for. The Zoom link is NOT inside: it opens in Deutli. */
export async function GET(request: NextRequest, ctx: RouteContext<"/dashboard/classes/[id]/calendar">) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Please log in.", { status: 401 });
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new NextResponse("Not found.", { status: 404 });

  const admin = createAdminClient();
  if (!admin) return new NextResponse("Not available.", { status: 503 });
  const [{ data: c }, { data: reg }] = await Promise.all([
    admin.from("live_classes").select("title, course_title, starts_at, duration_min, status").eq("id", id).maybeSingle(),
    admin.from("class_registrations").select("status").eq("class_id", id).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!c || reg?.status !== "registered") return new NextResponse("Not found.", { status: 404 });

  const start = new Date(c.starts_at as string);
  const end = new Date(start.getTime() + (c.duration_min as number) * 60_000);
  const page = `${request.nextUrl.origin}/dashboard/classes/${id}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Deutli//Classes//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${id}@deutli.com`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(`Deutli: ${c.title}`)}`,
    `DESCRIPTION:${icsText(`${c.course_title}\nJoin from Deutli: ${page}`)}`,
    `URL:${page}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Class starts in 10 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="deutli-class.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
