"use client";

// 参考来源页交互:关键词检索(走 /api/search,白名单域名 + 缓存)

import { useState } from "react";
import { Card, SectionTitle, Spinner } from "@/components/ui";
import type { SourceRef } from "@/types";

export function SourceSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SourceRef[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "检索失败");
      setResults(json.data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "检索失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionTitle icon="🔎" title="检索训练 / 营养 / 食谱资料" />
      <form onSubmit={search} className="flex gap-2">
        <input className="input" placeholder="例如:蛋白质 摄入 / 力量训练 组数 / 热量缺口" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary shrink-0" disabled={busy}>
          {busy ? <Spinner /> : "检索"}
        </button>
      </form>
      <p className="mt-2 text-xs text-zinc-400">
        仅返回可信来源(如 WHO、ACSM、CDC、NIH、中国营养学会等),结果自动去重并缓存 6 小时;支持配置 TAVILY_API_KEY 进行真实联网检索。
      </p>
      {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">{error}</p>}
      {results && (
        <ul className="mt-4 space-y-3">
          {results.length === 0 && <li className="text-sm text-zinc-400">没有找到相关来源,换个关键词试试。</li>}
          {results.map((r) => (
            <li key={r.url} className="rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
                {r.title}
              </a>
              <div className="mt-0.5 text-xs text-zinc-400">
                {r.source} · 访问于 {r.accessedAt.slice(0, 10)}
              </div>
              {r.summary && <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{r.summary}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
