import { Skeleton } from "@/components/ui";

export default function StatsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <Skeleton className="h-10 w-44" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
