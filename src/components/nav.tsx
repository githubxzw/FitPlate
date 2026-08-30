"use client";

// 顶部导航(含深色模式切换与退出登录)

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/today", label: "今日", emoji: "🔥" },
  { href: "/plan", label: "计划表", emoji: "📅" },
  { href: "/shopping", label: "购物清单", emoji: "🛒" },
  { href: "/sources", label: "参考来源", emoji: "📚" },
];

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  return (
    <button
      type="button"
      className="btn-ghost px-2.5 py-1.5"
      aria-label="切换深色模式"
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        try {
          localStorage.setItem("fitplate-theme", next ? "dark" : "light");
        } catch {}
      }}
    >
      <span aria-hidden>{dark ? "🌙" : "☀️"}</span>
    </button>
  );
}

export function Nav({ userName, userEmail }: { userName?: string | null; userEmail?: string | null }) {
  const pathname = usePathname();
  return (
    <header className="no-print sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/today" className="flex items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-600 text-white" aria-hidden>
            🥗
          </span>
          <span className="text-lg">
            Fit<span className="text-brand-600">Plate</span>
          </span>
        </Link>
        <nav className="ml-2 hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-xl px-3 py-1.5 text-sm transition",
                pathname.startsWith(l.href)
                  ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              )}
            >
              <span className="mr-1" aria-hidden>
                {l.emoji}
              </span>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <span className="hidden text-xs text-zinc-500 md:inline dark:text-zinc-400">{userName ?? userEmail}</span>
          <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => signOut({ callbackUrl: "/login" })}>
            退出
          </button>
        </div>
      </div>
      {/* 移动端底部式标签栏 */}
      <nav className="flex items-center justify-around border-t border-zinc-200/70 py-1.5 sm:hidden dark:border-zinc-800/70">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex flex-col items-center rounded-lg px-3 py-1 text-[11px]",
              pathname.startsWith(l.href) ? "text-brand-600 dark:text-brand-400" : "text-zinc-500 dark:text-zinc-400"
            )}
          >
            <span aria-hidden>{l.emoji}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
