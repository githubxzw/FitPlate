"use client";

// 图表组件(Recharts):今日完成度环形图 + 周完成度柱状图 + 宏量营养素对比

import {
  Bar,
  BarChart,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** 今日完成度进度环 */
export function ProgressRing({ value, label, sub }: { value: number; label: string; sub?: string }) {
  const v = Math.min(100, Math.max(0, value));
  const color = v >= 100 ? "#059669" : v >= 50 ? "#10b981" : "#f59e0b";
  return (
    <div className="relative h-40 w-40">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={[{ name: "done", value: v }]}
          innerRadius="72%"
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={999} fill={color} background={{ fill: "rgba(120,120,120,0.15)" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{label}</span>
        {sub && <span className="text-xs text-zinc-500 dark:text-zinc-400">{sub}</span>}
      </div>
    </div>
  );
}

/** 周完成度柱状图 */
export function WeekBars({ data }: { data: { day: string; value: number; done: boolean }[] }) {
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            formatter={(v) => [`${v}%`, "完成度"]}
            contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid rgba(120,120,120,.2)" }}
            cursor={{ fill: "rgba(120,120,120,.08)" }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.done ? "#10b981" : d.value > 0 ? "#6ee7b7" : "rgba(120,120,120,.25)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** 三大营养素 vs 目标 */
export function MacroBars({
  items,
}: {
  items: { label: string; actual: number; target: number; unit: string; tone: string }[];
}) {
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={56} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(v, _n, _item, index) => {
              const item = items[typeof index === "number" ? index : 0];
              return [`${v}${item?.unit ?? "g"} / 目标 ${item?.target ?? "-"}${item?.unit ?? "g"}`, item?.label ?? ""];
            }}
            contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid rgba(120,120,120,.2)" }}
            cursor={{ fill: "rgba(120,120,120,.08)" }}
          />
          <Bar dataKey="actual" radius={[0, 6, 6, 0]} background={{ fill: "rgba(120,120,120,.12)" }} barSize={16}>
            {items.map((d, i) => (
              <Cell key={i} fill={d.tone} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
