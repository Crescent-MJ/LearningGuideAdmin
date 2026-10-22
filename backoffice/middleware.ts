import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

const LOCALE_PREFIX = /^\/(en-GB|zh-CN)(?=\/|$)/;

/**
 * native i18n 入口：所有页面路径都必须带 locale 前缀，
 * 并把 locale 放进请求头供根 layout 设置 <html lang>。
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (LOCALE_PREFIX.test(pathname)) {
    const locale = pathname.split("/")[1];
    const headers = new Headers(request.headers);
    if (isLocale(locale)) headers.set("x-locale", locale);
    return NextResponse.next({ request: { headers } });
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|.*\\.[^/]+$).*)"],
};
