import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getUserIdOrNull } from "@/lib/api";
import { DISCLAIMER_SHORT } from "@/lib/constants";

export default async function LoginPage() {
  const userId = await getUserIdOrNull();
  if (userId) redirect("/today");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-brand-50 via-zinc-50 to-sky-50 px-4 py-10 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-2xl text-white shadow-lg" aria-hidden>
            🥗
          </div>
          <h1 className="text-2xl font-bold">
            Fit<span className="text-brand-600">Plate</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">科学减脂,从一份可执行的计划开始</p>
        </div>
        <div className="card p-6">
          <LoginForm />
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
