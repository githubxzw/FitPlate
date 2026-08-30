"use client";

// 智能图片:优先走 /api/img(可配置真实图片服务),加载失败自动降级为本地 SVG 占位

import { useState } from "react";
import { cn } from "@/lib/utils";

export function SmartImage({
  seed,
  emoji,
  label,
  query,
  className,
  alt,
}: {
  seed: string;
  emoji: string;
  label: string;
  query?: string;
  className?: string;
  alt?: string;
}) {
  const [fallback, setFallback] = useState(false);
  const params = new URLSearchParams({ seed, emoji, label });
  if (query) params.set("q", query);
  if (fallback) params.set("fallback", "1");
  return (
    <img
      src={`/api/img?${params.toString()}`}
      alt={alt ?? label}
      loading="lazy"
      onError={() => setFallback(true)}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
