"use client";

// UI 基础组件集(卡片/按钮/徽章/进度/骨架/空状态/弹窗/消息)

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("card p-5", className)}>{children}</div>;
}

export function SectionTitle({
  icon,
  title,
  right,
  className,
}: {
  icon?: string;
  title: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-2", className)}>
      <h2 className="flex items-center gap-2 text-base font-semibold">
        {icon && <span aria-hidden>{icon}</span>}
        {title}
      </h2>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = "brand",
  className,
}: {
  children: React.ReactNode;
  tone?: "brand" | "amber" | "sky" | "zinc" | "rose" | "emerald";
  className?: string;
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    zinc: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return <span className={cn("chip", tones[tone], className)}>{children}</span>;
}

export function CheckButton({
  checked,
  onChange,
  label,
  size = "md",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={cn(
        "btn",
        size === "sm" ? "px-2.5 py-1 text-xs" : "",
        checked
          ? "bg-brand-600 text-white hover:bg-brand-700"
          : "border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      )}
    >
      <span aria-hidden>{checked ? "✓" : "○"}</span>
      {label}
    </button>
  );
}

export function Progress({ value, tone = "brand", className }: { value: number; tone?: "brand" | "amber" | "sky" | "rose"; className?: string }) {
  const tones: Record<string, string> = {
    brand: "bg-brand-500",
    amber: "bg-amber-500",
    sky: "bg-sky-500",
    rose: "bg-rose-500",
  };
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800", className)}>
      <div
        className={cn("h-full rounded-full transition-all", tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Stat({ label, value, sub, className }: { label: string; value: React.ReactNode; sub?: string; className?: string }) {
  return (
    <div className={cn("rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/60", className)}>
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-0.5 text-lg font-semibold leading-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-400">{sub}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-zinc-200/70 dark:bg-zinc-800", className)} />;
}

export function EmptyState({
  emoji = "🌱",
  title,
  desc,
  action,
}: {
  emoji?: string;
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
      <span className="text-3xl" aria-hidden>
        {emoji}
      </span>
      <div className="font-medium">{title}</div>
      {desc && <div className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{desc}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
      role="status"
      aria-label="加载中"
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-zinc-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button className="btn-ghost px-2 py-1" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** 轻量提示条(自动消失) */
export function Toast({ message, tone = "ok" }: { message: string | null; tone?: "ok" | "err" }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(t);
  }, [message]);
  if (!message || !visible) return null;
  return (
    <div
      className={cn(
        "no-print fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full px-4 py-2 text-sm text-white shadow-lg",
        tone === "ok" ? "bg-zinc-900 dark:bg-brand-600" : "bg-rose-600"
      )}
      role="status"
    >
      {message}
    </div>
  );
}

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-900/20 dark:text-amber-300", className)}>
      ⚠️ 热量与运动建议仅供参考,不构成医疗或营养治疗建议。如有慢性疾病、孕期/哺乳期、未成年或饮食障碍史,请先咨询专业人士。
    </p>
  );
}
