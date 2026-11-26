"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { allow } from "@/lib/rate-limit";
import { HELPED_IDS, REPORT_REASON_IDS } from "@/lib/reviews/constants";
import { getEligibility } from "@/lib/reviews/data";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error: string } | { ok: true };
const SAVE_ERROR = "We couldn't save this. Check your internet and try again.";
const TOO_MANY = "Too many tries. Please wait a while and try again.";

function refresh() {
  revalidatePath("/dashboard/teachers", "layout");
  revalidatePath("/dashboard/academies", "layout");
  revalidatePath("/teacher/student-reviews");
  revalidatePath("/admin/reviews");
}

const reviewSchema = z.object({
  teacherId: z.uuid(),
  rating: z.number().int().min(1, "Choose 1 to 5 stars.").max(5, "Choose 1 to 5 stars."),
  helped: z.array(z.enum(HELPED_IDS)).max(5).default([]),
  body: z.string().trim().max(600, "Keep your review under 600 characters.").default(""),
});

/** A verified student writes or edits their review of a teacher. One per student per teacher. */
export async function saveReview(input: unknown): Promise<Result> {
  const user = await requireUser(["student"]);
  const p = reviewSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  const admin = createAdminClient();
  if (!admin) return { error: SAVE_ERROR };
  if (!(await allow(`review:${user.id}`, 15, 3600))) return { error: TOO_MANY };

  const ok = await getEligibility(admin, user.id, p.data.teacherId);
  if (!ok.ok) return { error: "Reviews come from students who have studied with this teacher: 14 days in their batch, or a class you attended." };

  // The status and the teacher's reply are not part of this write, so editing never unhides a hidden review.
  const { error } = await admin.from("teacher_reviews").upsert(
    {
      teacher_id: p.data.teacherId,
      student_id: user.id,
      academy_id: ok.academyId,
      rating: p.data.rating,
      helped: [...new Set(p.data.helped)],
      body: p.data.body || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "teacher_id,student_id" },
  );
  if (error) return { error: SAVE_ERROR };
  refresh();
  return { ok: true };
}

export async function deleteMyReview(teacherId: unknown): Promise<Result> {
  const user = await requireUser(["student"]);
  const id = z.uuid().safeParse(teacherId);
  const admin = createAdminClient();
  if (!id.success || !admin) return { error: SAVE_ERROR };
  const { error } = await admin.from("teacher_reviews").delete().eq("teacher_id", id.data).eq("student_id", user.id);
  if (error) return { error: SAVE_ERROR };
  refresh();
  return { ok: true };
}

const reportSchema = z.object({ reviewId: z.uuid(), reason: z.enum(REPORT_REASON_IDS), note: z.string().trim().max(300, "Keep the note under 300 characters.").default("") });

/** Anyone logged in (except the author) can report a review. A report only puts it in the admin's queue. */
export async function reportReview(input: unknown): Promise<Result> {
  const user = await requireUser();
  const p = reportSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  const admin = createAdminClient();
  if (!admin) return { error: SAVE_ERROR };
  if (!(await allow(`report-review:${user.id}`, 20, 3600))) return { error: TOO_MANY };

  const { data: review } = await admin.from("teacher_reviews").select("student_id, status").eq("id", p.data.reviewId).maybeSingle();
  if (!review || review.status !== "published") return { error: "That review isn't available." };
  if (review.student_id === user.id) return { error: "You can't report your own review." };
  const { error } = await admin
    .from("review_reports")
    .upsert({ review_id: p.data.reviewId, reporter_id: user.id, reason: p.data.reason, note: p.data.note || null, resolved: false }, { onConflict: "review_id,reporter_id" });
  if (error) return { error: SAVE_ERROR };
  revalidatePath("/admin/reviews");
  return { ok: true };
}

const replySchema = z.object({ reviewId: z.uuid(), text: z.string().trim().max(400, "Keep your reply under 400 characters.") });

/** The teacher answers a review once (an empty reply removes it). Only the teacher the review is about may do it. */
export async function replyToReview(input: unknown): Promise<Result> {
  const user = await requireUser(["teacher"]);
  const p = replySchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  const admin = createAdminClient();
  if (!admin) return { error: SAVE_ERROR };
  const { data, error } = await admin
    .from("teacher_reviews")
    .update({ reply: p.data.text || null, replied_at: p.data.text ? new Date().toISOString() : null })
    .eq("id", p.data.reviewId)
    .eq("teacher_id", user.id)
    .select("id");
  if (error || !data?.length) return { error: SAVE_ERROR };
  refresh();
  return { ok: true };
}

const modSchema = z.object({ reviewId: z.uuid(), action: z.enum(["hide", "restore", "dismiss"]) });

/** Deutli admins: hide a review (and close its reports), bring one back, or dismiss the reports and keep it. */
export async function moderateReview(input: unknown): Promise<Result> {
  await requireUser(["academy_admin", "super_admin"]);
  const p = modSchema.safeParse(input);
  if (!p.success) return { error: SAVE_ERROR };
  const admin = createAdminClient();
  if (!admin) return { error: SAVE_ERROR };
  const { reviewId, action } = p.data;
  if (action === "hide" || action === "restore") {
    const { error } = await admin.from("teacher_reviews").update({ status: action === "hide" ? "hidden" : "published", updated_at: new Date().toISOString() }).eq("id", reviewId);
    if (error) return { error: SAVE_ERROR };
  }
  if (action === "hide" || action === "dismiss") await admin.from("review_reports").update({ resolved: true }).eq("review_id", reviewId);
  refresh();
  return { ok: true };
}
