"use client";

// 登录 / 注册(演示账号提示见页面下方)

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "register") {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "注册失败");
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError(mode === "login" ? "邮箱或密码不正确" : "注册后登录失败,请重试");
        return;
      }
      // 有无档案在 /today 里判断并跳转
      router.push("/today");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "出错了,请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`rounded-lg py-1.5 text-sm font-medium transition ${
              mode === m ? "bg-white shadow dark:bg-zinc-900" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {m === "login" ? "登录" : "注册"}
          </button>
        ))}
      </div>

      {mode === "register" && (
        <div>
          <label className="label" htmlFor="name">
            昵称
          </label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={20} placeholder="怎么称呼你" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">
          邮箱
        </label>
        <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          密码
        </label>
        <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="至少 8 位" />
      </div>

      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">{error}</p>}

      <button className="btn-primary w-full py-2.5" disabled={busy}>
        {busy && <Spinner />}
        {mode === "login" ? "登录" : "注册并开始"}
      </button>

      <p className="text-center text-xs text-zinc-400">
        演示账号:demo@fitplate.app · 密码 fitplate123
      </p>
    </form>
  );
}
