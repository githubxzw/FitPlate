"use client";

// 导航:顶部毛玻璃导航(桌面) + 移动端固定底部 Tab 栏(带 iOS 安全区适配)

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const LINKS: { href: string; label: string; emoji: string; exact?: boolean }[] = [
  { href: "/today", label: "今日", emoji: "🔥" },
  { href: "/plan", label: "计划表", emoji: "📅", exact: true },
  { href: "/plan/customize", label: "周模板", emoji: "🗓️" },
  { href: "/stats", label: "数据", emoji: "📊" },
  { href: "/shopping", label: "购物", emoji: "🛒" },
  { href: "/sources", label: "来源", emoji: "📚" },
];

/** 高亮判断:/plan 需要精确匹配,否则「计划表」会与「周模板」同时高亮 */
function linkActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname.startsWith(href);
}

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
    <>
      <header className="no-print glass sticky top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/today" className="flex items-center gap-2 font-bold">
            <span
              className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-brand"
              aria-hidden
            >
              🥗
            </span>
            <span className="text-lg">
              Fit<span className="text-gradient">Plate</span>
            </span>
          </Link>
          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            {LINKS.map((l) => {
              const active = linkActive(pathname, l.href, l.exact);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "relative rounded-xl px-3 py-1.5 text-sm transition duration-150",
                    active
                      ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  )}
                >
                  <span className="mr-1" aria-hidden>
                    {l.emoji}
                  </span>
                  {l.label}
                  {active && (
                    <span className="absolute -bottom-[5px] left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-brand-500" aria-hidden />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <span className="hidden text-xs text-zinc-500 md:inline dark:text-zinc-400">{userName ?? userEmail}</span>
            <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => signOut({ callbackUrl: "/login" })}>
              退出
            </button>
          </div>
        </div>
      </header>

      {/* 移动端固定底部 Tab 栏 */}
      <nav
        className="no-print glass fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] sm:hidden"
        aria-label="底部导航"
      >
        {LINKS.map((l) => {
          const active = linkActive(pathname, l.href, l.exact);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition duration-150",
                active ? "text-brand-600 dark:text-brand-400" : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "rounded-xl px-3 py-0.5 text-base transition duration-150",
                  active && "bg-brand-50 dark:bg-brand-900/40"
                )}
              >
                {l.emoji}
              </span>
              {l.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
