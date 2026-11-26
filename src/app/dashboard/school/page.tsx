import type { Metadata } from "next";
import Link from "next/link";

import { PostList } from "@/components/news/post-list";
import { requireUser } from "@/lib/auth/dal";
import { getBrandForUser } from "@/lib/branding/data";
import { listPosts } from "@/lib/news/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "News & info" };

export default async function SchoolPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const tab = sp.tab === "info" ? "info" : "news";
  const [all, brand] = await Promise.all([listPosts(user.id), getBrandForUser(user.id)]);
  const news = all.filter((p) => p.kind === "news");
  const info = all.filter((p) => p.kind === "info");
  const shown = tab === "info" ? info : news;
  const unreadNews = news.filter((p) => !p.read).length;
  const unreadInfo = info.filter((p) => !p.read).length;

  const tabs = [
    { id: "news", label: "News", unread: unreadNews },
    { id: "info", label: "Information", unread: unreadInfo },
  ] as const;

  return (
    <main className="mx-auto grid max-w-[760px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">News &amp; info</h1>
        <p className="text-[15px] text-muted-foreground">{brand ? `From ${brand.name}.` : "From your teacher or school."} Set by them, not by Deutli.</p>
      </header>

      <nav aria-label="News or information" className="flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard/school?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn("inline-flex h-11 items-center gap-2 rounded-full border px-5 text-[15px] font-semibold transition-colors", tab === t.id ? "border-gold-ink bg-gold-soft" : "border-border bg-card text-muted-foreground hover:border-gold-ink/60")}
          >
            {t.label}
            {t.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[11px] font-semibold text-ink-foreground">{t.unread}<span className="sr-only"> new</span></span>}
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
          {tab === "news" ? "No news yet. When your teacher or school posts something, it shows up here." : "Nothing here yet. School rules, books to buy and contact details will show up here."}
        </p>
      ) : (
        <PostList key={tab} posts={shown} showDate={tab === "news"} />
      )}
    </main>
  );
}
