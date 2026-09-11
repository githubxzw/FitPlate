"use client";

// 动作示范弹窗:内置动图 + 分步说明 + 要点;无动图时提供站外示范搜索入口

import { Badge, Modal } from "@/components/ui";
import { EXERCISE_MAP, demoOf } from "@/lib/exercises";

export function ExerciseDemoModal({
  exerciseId,
  onClose,
}: {
  exerciseId: string | null;
  onClose: () => void;
}) {
  const ex = exerciseId ? EXERCISE_MAP[exerciseId] : null;
  const demo = exerciseId ? demoOf(exerciseId) : undefined;
  const searchUrl = ex
    ? `https://search.bilibili.com/all?keyword=${encodeURIComponent(`${ex.name} 标准动作 示范`)}`
    : "";

  return (
    <Modal open={exerciseId !== null} onClose={onClose} title={`动作示范 · ${ex?.name ?? ""}`}>
      {ex && (
        <div className="space-y-4">
          {demo ? (
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <div className="relative shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800">
                {/* 动图为 180×180,放大 2 倍展示 */}
                <img
                  src={demo.gif}
                  alt={`${ex.name} 动作示范动图`}
                  width={264}
                  height={264}
                  className="h-[264px] w-[264px] object-cover"
                  loading="lazy"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="brand">🎯 {ex.muscle}</Badge>
                  <Badge tone="sky">
                    {ex.equipment.some((e) => e === "none") ? "徒手" : "轻器械"}
                  </Badge>
                </div>
                {demo.steps.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-xs font-semibold text-zinc-400">分步说明</div>
                    <ol className="space-y-1.5 text-sm leading-relaxed">
                      {demo.steps.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                            {i + 1}
                          </span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center dark:border-zinc-700">
              <span className="animate-float text-4xl" aria-hidden>
                {ex.emoji}
              </span>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                该动作暂无内置动图,可前往 B 站查看标准示范视频。
              </p>
              <a className="btn-primary" href={searchUrl} target="_blank" rel="noopener noreferrer">
                ▶ 在 B 站搜索示范
              </a>
            </div>
          )}

          {ex.tips.length > 0 && (
            <div className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              <div className="mb-1 text-xs font-semibold text-amber-700 dark:text-amber-300">💡 动作要点</div>
              <ul className="list-inside list-disc space-y-0.5">
                {ex.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-zinc-400">
            {demo ? "动图 © Gym visual(gymvisual.com),经开源数据集授权分发,仅用于动作教学演示。" : "示范链接跳转至第三方网站,内容以该平台为准。"}
          </p>
        </div>
      )}
    </Modal>
  );
}
