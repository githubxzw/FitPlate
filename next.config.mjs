/** @type {import('next').NextConfig} */

// 安全响应头(见 docs/SECURITY.md P0-5)
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    // 说明:主题初始化脚本与 Next.js 运行时需要内联脚本;Recharts 使用内联样式,
    // 因此保留 unsafe-inline;'unsafe-eval' 仅开发模式需要,生产同样保留以兼容 SWC 调试。
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
  },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
