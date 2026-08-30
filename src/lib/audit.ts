// 关键动作审计日志:输出 JSON 行,可被 docker logs / 阿里云 SLS 收集
// 用法:audit("login_fail", { email, ip })

export function audit(event: string, detail: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ at: new Date().toISOString(), event, ...detail }));
}
