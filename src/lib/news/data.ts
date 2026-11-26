import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PostKind = "news" | "info";
export type Post = { id: string; kind: PostKind; title: string; body: string; pinned: boolean; createdAt: string; updatedAt: string; read: boolean };

/** News and information of the viewer's own workspace (RLS shows a student only their own). Pinned first, then newest. */
export async function listPosts(userId: string, kind?: PostKind): Promise<Post[]> {
  const supabase = await createClient();
  let q = supabase.from("academy_posts").select("id, kind, title, body, pinned, created_at, updated_at").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(200);
  if (kind) q = q.eq("kind", kind);
  const [posts, reads] = await Promise.all([q, supabase.from("academy_post_reads").select("post_id").eq("user_id", userId).limit(2000)]);
  const seen = new Set(((reads.data ?? []) as { post_id: string }[]).map((r) => r.post_id));
  return ((posts.data ?? []) as { id: string; kind: PostKind; title: string; body: string; pinned: boolean; created_at: string; updated_at: string }[]).map((p) => ({
    id: p.id, kind: p.kind, title: p.title, body: p.body, pinned: p.pinned, createdAt: p.created_at, updatedAt: p.updated_at, read: seen.has(p.id),
  }));
}

/** Posts a student has not opened yet (for the menu badge). */
export async function unreadCount(userId: string): Promise<number> {
  const posts = await listPosts(userId);
  return posts.filter((p) => !p.read).length;
}
