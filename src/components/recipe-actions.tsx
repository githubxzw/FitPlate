"use client";

// 食谱详情页的交互按钮:换一道 / 调整份量

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner, Toast } from "@/components/ui";

export function RecipeActions({ date, slot, scale }: { date: string; slot: string; scale: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function call(action: "swap" | "scale", nextScale?: number) {
    setBusy(action + (nextScale ?? ""));
    try {
      const res = await fetch("/api/meals/day", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, slot, action, scale: nextScale }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "操作失败");
      setToast(action === "swap" ? "已换一道菜" : "份量已更新");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn-ghost text-sm" disabled={busy !== null} onClick={() => call("swap")}>
        {busy?.startsWith("swap") ? <Spinner /> : "🔁"} 换一道
      </button>
      <div className="flex items-center gap-1 rounded-xl border border-zinc-200 px-1 dark:border-zinc-700">
        <button className="btn-ghost border-0 px-2 py-1" disabled={busy !== null || scale <= 0.5} onClick={() => call("scale", Math.max(0.5, scale - 0.1))}>
          −
        </button>
        <span className="text-sm">份量 ×{scale}</span>
        <button className="btn-ghost border-0 px-2 py-1" disabled={busy !== null || scale >= 2} onClick={() => call("scale", Math.min(2, scale + 0.1))}>
          +
        </button>
      </div>
      <Toast message={toast} />
      <Toast message={err} tone="err" />
    </div>
  );
}
