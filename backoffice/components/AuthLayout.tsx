"use client";

import { LocaleSwitch } from "@/components/LocaleSwitch";
import { getMessages, t } from "@/lib/i18n/messages";
import { useLocale } from "@/lib/i18n/useLocale";

/**
 * 认证页外壳，视觉与 Portal Sign In 对齐：
 * 深色背景图 + 顶部品牌条 + 居中白卡 + 返回链接 + 法律声明。
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  backHref,
  backLabel,
  showLegal = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  showLegal?: boolean;
}) {
  const locale = useLocale();
  const messages = getMessages(locale);

  return (
    <div className="authPage">
      <div className="authTopBar">
        <span className="authMark">
          <span className="brandMark" aria-hidden="true">
            LG
          </span>
          {messages.app.name}
        </span>
        <div className="authTopRight">
          <LocaleSwitch persist={false} className="localeChip localeChipOnDark" />
        </div>
      </div>

      <main className="authStage">
        <div className="authHeading">
          <h1 className="authTitle">{title}</h1>
          {subtitle ? <p className="authSubtitle">{subtitle}</p> : null}
        </div>

        <div className="authCard">{children}</div>

        {backHref && backLabel ? (
          <a className="authBack" href={backHref}>
            {backLabel}
          </a>
        ) : null}

        {showLegal ? (
          <p className="authLegal">
            {t(locale, "auth.legalPrefix")}{" "}
            <a
              href={`https://www.ilovelearningguide.com/${locale}/terms-of-service`}
              target="_blank"
              rel="noreferrer"
            >
              {t(locale, "auth.terms")}
            </a>{" "}
            &amp;{" "}
            <a
              href={`https://www.ilovelearningguide.com/${locale}/privacy-policy`}
              target="_blank"
              rel="noreferrer"
            >
              {t(locale, "auth.privacy")}
            </a>
          </p>
        ) : null}
      </main>
    </div>
  );
}
