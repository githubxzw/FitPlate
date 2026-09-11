import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getUserIdOrNull } from "@/lib/api";
import { DISCLAIMER_SHORT } from "@/lib/constants";

export default async function LoginPage() {
  const userId = await getUserIdOrNull();
  if (userId) redirect("/today");

  const registrationEnabled = process.env.REGISTRATION_ENABLED !== "false";
  const inviteRequired = Boolean(process.env.INVITE_CODE?.trim());

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-zinc-50 to-sky-50 px-4 py-10 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      {/* 装饰光斑 */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-200/50 blur-3xl dark:bg-brand-900/30" aria-hidden />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-sky-200/50 blur-3xl dark:bg-sky-900/20" aria-hidden />

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-3 grid h-16 w-16 animate-float place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-3xl text-white shadow-brand"
            aria-hidden
          >
            🥗
          </div>
          <h1 className="text-3xl font-bold">
            Fit<span className="text-gradient">Plate</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">科学增肌减脂,从一份可执行的计划开始</p>
        </div>

        <div className="card p-6">
          <LoginForm registrationEnabled={registrationEnabled} inviteRequired={inviteRequired} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
          <div className="rounded-xl bg-white/60 px-2 py-2 backdrop-blur-sm dark:bg-zinc-900/60">
            <div className="text-base" aria-hidden>
              🏋️
            </div>
            每日训练计划
          </div>
          <div className="rounded-xl bg-white/60 px-2 py-2 backdrop-blur-sm dark:bg-zinc-900/60">
            <div className="text-base" aria-hidden>
              🥗
            </div>
            减脂餐配方
          </div>
          <div className="rounded-xl bg-white/60 px-2 py-2 backdrop-blur-sm dark:bg-zinc-900/60">
            <div className="text-base" aria-hidden>
              🔥
            </div>
            打卡与成就
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-zinc-400">{DISCLAIMER_SHORT}</p>
        <p className="mt-2 text-center text-[11px] text-zinc-300 dark:text-zinc-600">
          <Link href="/sources" className="underline">
            参考来源
          </Link>
        </p>
      </div>
    </main>
  );
}
