import type { Metadata } from "next";

import { NewsManager } from "@/components/news/news-manager";
import { getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { listPosts } from "@/lib/news/data";

export const metadata: Metadata = { title: "News & info" };

export default async function TeacherNewsPage() {
  const user = await requireUser(["teacher"]);
  const ws = await getMyWorkspace(user.id);
  const canPost = !!ws && (ws.role === "owner" || ws.role === "admin");
  const posts = canPost ? await listPosts(user.id) : [];

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">News &amp; info</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">
          Tell all your students one thing in one place: a new batch, the school rules, which book to buy. It replaces the long WhatsApp message nobody scrolls back to.
        </p>
      </header>
      {!ws ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">You need a workspace first. Please contact us.</p>
      ) : !canPost ? (
        <p className="max-w-[760px] rounded-2xl border border-dashed border-border px-4 py-8 text-[14px] text-muted-foreground">
          News for the whole school is posted by the owner or an admin of {ws.workspace.name}. To tell your own students something, post an announcement in your batch under Batches.
        </p>
      ) : (
        <NewsManager posts={posts} />
      )}
    </main>
  );
}
