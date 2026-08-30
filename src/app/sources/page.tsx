import { getUserIdOrNull } from "@/lib/api";
import { db } from "@/lib/db";
import { Nav } from "@/components/nav";
import { SourceSearch } from "@/components/source-search";
import { Card, Disclaimer, SectionTitle } from "@/components/ui";
import { CURATED_SOURCES } from "@/lib/search";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const userId = await getUserIdOrNull();
  if (!userId) redirect("/login");
  const user = await db.user.findUnique({ where: { id: userId } });

  return (
    <div className="min-h-dvh">
      <Nav userName={user?.name} userEmail={user?.email} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold">参考来源 📚</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            FitPlate 的建议参考以下权威机构资料;引用内容版权归原作者所有。
          </p>
        </div>

        <div className="space-y-5">
          <SourceSearch />

          <Card>
            <SectionTitle icon="🏛️" title="内置可信来源库" />
            <ul className="space-y-3">
              {CURATED_SOURCES.map((s) => (
                <li key={s.url} className="rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
                    {s.title}
                  </a>
                  <div className="mt-0.5 text-xs text-zinc-400">{s.source}</div>
                  {s.summary && <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{s.summary}</p>}
                </li>
              ))}
            </ul>
          </Card>

          <Disclaimer />
          <p className="text-xs leading-relaxed text-zinc-400">
            本页与全站内容均不构成医疗建议。涉及疾病、孕期/哺乳期、未成年人或饮食障碍史的情况,请咨询医生或注册营养师后再开始任何训练或饮食调整。
          </p>
        </div>
      </main>
    </div>
  );
}
