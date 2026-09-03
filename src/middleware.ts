export { default } from "next-auth/middleware";

// 保护需要登录的应用页面(API 与公开页不在此列)
export const config = {
  matcher: ["/today", "/plan/:path*", "/meal/:path*", "/shopping", "/sources", "/onboarding"],
};
