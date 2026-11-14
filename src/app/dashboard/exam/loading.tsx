import { Skeleton } from "@/components/ui/skeleton";

export default function ExamLoading() {
  return (
    <main className="mx-auto grid max-w-[1240px] gap-8 px-4 py-6 sm:px-6 md:px-8 md:py-8" aria-busy="true">
      <span className="sr-only">Loading your exams…</span>
      <div className="grid gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-[28rem] max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-[263/375] rounded-lg" />
        ))}
      </div>
    </main>
  );
}
