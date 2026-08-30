import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-56" />
          <Skeleton className="h-40" />
        </div>
      </div>
      <p className="text-center text-xs text-zinc-400">正在加载你的计划…</p>
    </div>
  );
}
