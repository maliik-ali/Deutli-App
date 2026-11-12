import { Skeleton } from "@/components/ui/skeleton";

export default function DictionaryLoading() {
  return (
    <main className="mx-auto grid max-w-[960px] gap-6 px-4 py-8 sm:px-8" aria-busy="true">
      <span className="sr-only">Loading the word dictionary…</span>
      <div className="grid gap-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-[32rem] max-w-full" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </main>
  );
}
