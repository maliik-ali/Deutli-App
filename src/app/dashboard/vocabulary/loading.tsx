import { Skeleton } from "@/components/ui/skeleton";

export default function VocabularyLoading() {
  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8" aria-busy="true">
      <span className="sr-only">Loading your words…</span>
      <div className="grid gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-[28rem] max-w-full" />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <Skeleton className="h-[480px] rounded-2xl" />
    </main>
  );
}
