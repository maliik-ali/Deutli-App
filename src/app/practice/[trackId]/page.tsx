import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PracticeReader } from "@/components/practice/reader";
import { requireUser } from "@/lib/auth/dal";
import { getPracticeTrack } from "@/lib/practice/data";

export const metadata: Metadata = { title: "Daily Practice" };

export default async function PracticeTrackPage(props: PageProps<"/practice/[trackId]">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const { trackId } = await props.params;
  const track = await getPracticeTrack(trackId, user.id);
  if (!track) notFound();
  // key: start fresh (step 1, audio at 0:00) when moving to another text.
  return <PracticeReader key={track.id} track={track} />;
}
