"use client";

import { Disclaimer } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 py-16 text-center">
      <span className="text-4xl" aria-hidden>
        😵
      </span>
      <h2 className="text-lg font-semibold">页面出错了</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{error.message || "发生了意外错误,请稍后重试。"}</p>
      <button className="btn-primary mt-2" onClick={reset}>
        重试
      </button>
      <Disclaimer className="mt-6" />
    </div>
  );
}
