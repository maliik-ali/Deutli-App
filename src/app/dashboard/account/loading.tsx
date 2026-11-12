import { Skeleton } from "@/components/ui/skeleton";

export default function AccountLoading() {
  return (
    <main className="mx-auto grid w-full max-w-[860px] gap-8 px-4 py-6 sm:px-6 md:px-8 md:py-10" aria-busy="true">
      <span className="sr-only">Loading your account…</span>
      <div className="grid gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="grid gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </main>
  );
}
