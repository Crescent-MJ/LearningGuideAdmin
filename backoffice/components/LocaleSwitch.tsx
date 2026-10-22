"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { localeHref, otherLocale } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/useLocale";

/**
 * 语言切换（PORT-NAV-006）。
 * persist=true 时先落库当前员工的偏好，再跳转；
 * 未登录页面传 false，交给 middleware 依据 URL 写 Cookie。
 */
export function LocaleSwitch({
  persist,
  className = "localeBadge",
}: {
  persist: boolean;
  className?: string;
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const target = otherLocale(locale);
  const [busy, setBusy] = useState(false);

  async function change() {
    setBusy(true);
    const href = localeHref(pathname ?? `/${locale}/course`, target);
    if (persist) {
      try {
        await fetch("/api/preferences/locale", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale: target }),
        });
      } catch {
        // 偏好落库失败不阻断切换：URL 与 Cookie 仍会更新
      }
    }
    router.push(href);
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => void change()}
      disabled={busy}
      style={{ cursor: "pointer" }}
      aria-label={`Switch to ${target}`}
    >
      {locale} → {target}
    </button>
  );
}
