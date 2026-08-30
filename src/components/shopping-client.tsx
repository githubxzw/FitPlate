"use client";

// 购物清单:范围切换 + 勾选(本地状态)+ 打印/CSV

import { useMemo, useState } from "react";
import { Badge, Card, Disclaimer, SectionTitle } from "@/components/ui";
import { shortDate, cn } from "@/lib/utils";

export interface ShoppingItemView {
  name: string;
  grams: number;
  cat: string;
  usedIn: string[];
}

const CAT_TONE: Record<string, "brand" | "sky" | "amber" | "rose" | "zinc" | "emerald"> = {
  蛋白质: "rose",
  蔬果: "emerald",
  主食: "amber",
  乳品: "sky",
  干货坚果: "brand",
  调味: "zinc",
};

export function ShoppingClient({
  items: initialItems,
  from,
  to,
  presets,
}: {
  items: ShoppingItemView[];
  from: string;
  to: string;
  presets: { label: string; from: string; to: string }[];
}) {
  const [range, setRange] = useState({ from, to });
  const [items, setItems] = useState(initialItems);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, ShoppingItemView[]>();
    for (const i of items) {
      const list = map.get(i.cat) ?? [];
      list.push(i);
      map.set(i.cat, list);
    }
    return [...map.entries()];
  }, [items]);

  async function changeRange(next: { from: string; to: string }) {
    setRange(next);
    setLoading(true);
    try {
      const res = await fetch(`/api/shopping-list?from=${next.from}&to=${next.to}`);
      const json = await res.json();
      if (res.ok) {
        setItems(json.data.items);
        setChecked(new Set());
      }
    } finally {
      setLoading(false);
    }
  }

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => changeRange({ from: p.from, to: p.to })}
            className={cn("btn text-xs", range.from === p.from && range.to === p.to ? "btn-primary" : "btn-ghost")}
          >
            {p.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button className="btn-ghost text-xs" onClick={() => window.print()}>
            🖨️ 打印 / PDF
          </button>
          <a className="btn-ghost text-xs" href={`/api/export/csv?type=shopping&from=${range.from}&to=${range.to}`}>
            ⬇️ CSV
          </a>
        </div>
      </div>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        覆盖 {shortDate(range.from)} – {shortDate(range.to)} · 共 {items.length} 种食材 · 同名食材已自动合并用量
        {loading && " (加载中…)"}
      </p>

      {items.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-zinc-400">该时间范围内还没有饮食计划。</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {grouped.map(([cat, list]) => (
            <Card key={cat}>
              <SectionTitle
                title={
                  <span className="flex items-center gap-2">
                    {cat}
                    <Badge tone={CAT_TONE[cat] ?? "zinc"}>{list.length}</Badge>
                  </span>
                }
              />
              <ul className="space-y-1">
                {list.map((i) => {
                  const key = `${cat}:${i.name}`;
                  const isChecked = checked.has(key);
                  return (
                    <li key={key}>
                      <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                        <input type="checkbox" className="accent-brand-600" checked={isChecked} onChange={() => toggle(key)} />
                        <span className={cn("flex-1", isChecked && "text-zinc-400 line-through")}>
                          {i.name}
                          <span className="ml-2 tabular-nums text-zinc-500 dark:text-zinc-400">{i.grams} g</span>
                        </span>
                        <span className="text-[11px] text-zinc-400">{i.usedIn.join("、")}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <Disclaimer />
      <p className="print-footer">
        FitPlate 购物清单 · {range.from} 至 {range.to} · 热量与营养建议仅供参考。
      </p>
    </div>
  );
}
