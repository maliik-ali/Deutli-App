import { Skeleton } from "@/components/ui/skeleton";

export default function ClassesLoading() {
  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8" aria-busy="true">
      <span className="sr-only">Loading classes…</span>
      <div className="grid gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="grid max-w-[960px] gap-5">
        <Skeleton className="h-11 w-64 rounded-full" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-[72px] w-14 shrink-0 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[340px] rounded-2xl" />
      </div>
    </main>
  );
}
