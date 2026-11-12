import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col" aria-busy="true" aria-label="Loading your text">
      <div className="h-16 border-b border-border bg-card" />
      <div className="mx-auto grid w-full max-w-[720px] flex-1 content-start gap-4 px-4 py-10">
        <Skeleton className="h-8 w-2/3" />
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
      <div className="h-24 border-t border-border bg-card" />
    </div>
  );
}
