"use client";

import { useState } from "react";

import type { ErrorCode } from "@/contracts/envelope";
import { t } from "@/lib/i18n/messages";
import { useLocale } from "@/lib/i18n/useLocale";

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorCode(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const payload = (await response.json()) as { success: boolean; error: ErrorCode | null };
      if (!payload.success) {
        setErrorCode(payload.error ?? "INTERNAL_ERROR");
        return;
      }
      setSent(true);
    } catch {
      setErrorCode("INTERNAL_ERROR");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="authPage">
      <aside className="authBrand">
        <span className="authBrandName">{t(locale, "app.name")}</span>
        <p className="authBrandCopy">{t(locale, "forgot.subtitle")}</p>
      </aside>

      <form className="authPanel" onSubmit={handleSubmit} noValidate>
        <div>
          <h1 className="authTitle">{t(locale, "forgot.title")}</h1>
          <p className="authSubtitle">{t(locale, "forgot.subtitle")}</p>
        </div>

        {sent ? <div className="alert alertOk">{t(locale, "forgot.sent")}</div> : null}
        {errorCode ? (
          <div className="alert alertError">{t(locale, `errors.${errorCode}`)}</div>
        ) : null}

        <label className="field">
          <span className="fieldLabel">{t(locale, "signIn.emailLabel")}</span>
          <input
            className="fieldInput"
            type="email"
            autoComplete="username"
            placeholder={t(locale, "signIn.emailPlaceholder")}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <button className="button" type="submit" disabled={submitting}>
          {submitting ? t(locale, "forgot.submitting") : t(locale, "forgot.submit")}
        </button>

        <a className="linkButton" href={`/${locale}/sign-in`}>
          {t(locale, "common.back")}
        </a>
      </form>
    </div>
  );
}
