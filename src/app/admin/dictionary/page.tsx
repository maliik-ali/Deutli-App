import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { DictionaryUpload } from "@/components/admin/dictionary-upload";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { getDictionaryOverview } from "@/lib/dictionary/data";
import { getLanguage, textProps } from "@/lib/languages";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Word dictionary" };

export default async function AdminDictionaryPage(props: PageProps<"/admin/dictionary">) {
  await requireUser(["academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const search = typeof sp.q === "string" ? sp.q : "";
  const overview = await getDictionaryOverview(search);

  return (
    <AdminShell
      title="Word dictionary"
      description="Meanings students see when they save a word. Your uploaded meanings are used first and are free; AI only translates words that aren't here."
      back={{ href: "/admin", label: "Admin" }}
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Words", value: overview.total },
          { label: "From your sheets", value: overview.fromSheet },
          { label: "Translated by AI", value: overview.fromAi },
        ].map((s) => (
          <Card key={s.label} className="gap-1 p-4 sm:p-6">
            <span className="text-[13px] text-muted-foreground">{s.label}</span>
            <span className="font-heading text-2xl font-extrabold tabular-nums sm:text-[32px]">
              {s.value.toLocaleString("en-US")}
            </span>
          </Card>
        ))}
      </div>

      <Card>
        <div className="grid gap-1">
          <CardTitle className="text-lg">Upload words</CardTitle>
          <CardDescription>
            One row per word. Columns: <code className="text-foreground">german</code>,{" "}
            <code className="text-foreground">article</code> (der/die/das),{" "}
            <code className="text-foreground">plural</code>, then one column per language:{" "}
            <code className="text-foreground">en</code>, <code className="text-foreground">ur</code>,{" "}
            <code className="text-foreground">hi</code>… Uploading the same word again updates it.
          </CardDescription>
        </div>
        <DictionaryUpload />
      </Card>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-1">
            <CardTitle className="text-lg">{search ? `Results for “${search}”` : "Latest words"}</CardTitle>
            <CardDescription>Newest first, up to 30.</CardDescription>
          </div>
          <form className="relative w-full sm:w-72" role="search">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <label htmlFor="dictionary-search" className="sr-only">
              Search a German word
            </label>
            <input
              id="dictionary-search"
              name="q"
              defaultValue={search}
              placeholder="Search a German word"
              className="h-11 w-full rounded-xl border border-input bg-card pr-3 pl-9 text-[15px] outline-none placeholder:text-muted-foreground/70 focus-visible:border-gold-ink"
            />
          </form>
        </div>

        {overview.failed ? (
          <p className="text-destructive" role="alert">
            The dictionary couldn&apos;t load. Reload the page and try again.
          </p>
        ) : overview.entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-muted-foreground">
            {search ? (
              <>
                No word matches “{search}”.{" "}
                <Link href="/admin/dictionary" className="font-semibold text-gold-ink">
                  Show all
                </Link>
              </>
            ) : (
              "No words yet. Upload your first sheet above."
            )}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {overview.entries.map((e) => (
              <li key={e.key} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span lang="de" className="text-[15px] font-semibold">
                    {e.dictionaryForm ?? e.key}
                  </span>
                  {e.dictionaryForm && e.dictionaryForm.toLowerCase().split(" ").pop() !== e.key && (
                    <span lang="de" className="text-[13px] text-muted-foreground">
                      ({e.key})
                    </span>
                  )}
                  <Badge variant={e.source === "sheet" ? "success" : "outline"}>
                    {e.source === "sheet" ? "Sheet" : "AI"}
                  </Badge>
                </div>
                <dl className="flex flex-wrap gap-x-5 gap-y-1">
                  {Object.entries(e.translations).map(([code, text]) => {
                    const props = textProps(code);
                    return (
                      <div key={code} className="flex items-baseline gap-1.5">
                        <dt className="text-[12px] font-semibold text-subtle-foreground uppercase">
                          <abbr title={getLanguage(code)?.name} className="no-underline">
                            {code}
                          </abbr>
                        </dt>
                        <dd
                          lang={props.lang}
                          dir={props.dir}
                          className={cn(
                            "text-[15px] text-muted-foreground",
                            props.className,
                            code === "ur" && "text-lg text-foreground",
                          )}
                        >
                          {text}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AdminShell>
  );
}
