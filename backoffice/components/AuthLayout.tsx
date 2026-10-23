"use client";

import { LocaleSwitch } from "@/components/LocaleSwitch";
import { BrandMark, ShieldIcon } from "@/components/icons";
import { getMessages, t } from "@/lib/i18n/messages";
import { useLocale } from "@/lib/i18n/useLocale";

/**
 * 认证页外壳，按设计稿：白色品牌条 + 深色背景图 + 居中徽标/标题/副标题 + 白卡。
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
      <div className="authPageHeader">
        <span className="authBrand">
          <BrandMark size={24} />
          {messages.app.name}
        </span>
        <LocaleSwitch persist={false} />
      </div>

      <main className="authBody">
        <span className="authBadge">
          <ShieldIcon size={14} />
          {messages.app.name}
        </span>

        <h1 className="authTitle">{title}</h1>
        {subtitle ? <p className="authSubtitle">{subtitle}</p> : null}

        <div className="authCard">{children}</div>

        {backHref && backLabel ? (
          <a className="authFooterLink" href={backHref}>
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
