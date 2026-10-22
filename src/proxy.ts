import { NextResponse, type NextRequest } from "next/server";

const ACCESS_COOKIE = process.env.AUTH_ACCESS_COOKIE_NAME ?? "accessToken";
const REFRESH_COOKIE = process.env.AUTH_REFRESH_COOKIE_NAME ?? "refreshToken";

// Chưa có cookie phiên nào thì chuyển thẳng về đăng nhập ở server, khỏi tải JS rồi mới bị đá ra.
// Chỉ kiểm tra có cookie hay không; tính hợp lệ của phiên vẫn do BE quyết định.
export function proxy(request: NextRequest) {
  if (request.cookies.has(REFRESH_COOKIE) || request.cookies.has(ACCESS_COOKIE)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  // Tệp tĩnh (có đuôi, ví dụ ảnh/phông) không cần phiên.
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) return NextResponse.next();
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/|backend/|login|change-password).*)"],
};
