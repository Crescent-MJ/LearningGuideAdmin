"use client";

import { useState } from "react";

import type { ErrorCode } from "@/contracts/envelope";
import { t } from "@/lib/i18n/messages";
import { useLocale } from "@/lib/i18n/useLocale";
import { useQueryToken } from "@/lib/useQueryToken";

export default function ActivatePage() {
  const locale = useLocale();
  const { token, ready } = useQueryToken();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorCode(null);

    if (password !== confirmPassword) {
      setErrorCode("PASSWORD_MISMATCH");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword, locale }),
      });
      const payload = (await response.json()) as { success: boolean; error: ErrorCode | null };
      if (!payload.success) {
        setErrorCode(payload.error ?? "INTERNAL_ERROR");
        return;
      }
      setDone(true);
    } catch {
      setErrorCode("INTERNAL_ERROR");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="authPage">
        <aside className="authBrand">
          <span className="authBrandName">{t(locale, "app.name")}</span>
        </aside>
        <div className="authPanel">
          <p className="authSubtitle">{t(locale, "common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="authPage">
        <aside className="authBrand">
          <span className="authBrandName">{t(locale, "app.name")}</span>
        </aside>
        <div className="authPanel">
          <h1 className="authTitle">{t(locale, "activate.invalidTitle")}</h1>
          <p className="authSubtitle">{t(locale, "activate.missingToken")}</p>
          <a className="button" href={`/${locale}/sign-in`}>
            {t(locale, "activate.goSignIn")}
          </a>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="authPage">
        <aside className="authBrand">
          <span className="authBrandName">{t(locale, "app.name")}</span>
        </aside>
        <div className="authPanel">
          <h1 className="authTitle">{t(locale, "activate.successTitle")}</h1>
          <p className="authSubtitle">{t(locale, "activate.successBody")}</p>
          <a className="button" href={`/${locale}/sign-in`}>
            {t(locale, "activate.goSignIn")}
          </a>
        </div>
      </div>
    );
  }

  // PORT-ACT-003：过期与已使用给出不同提示
  const invalidPanel =
    errorCode === "INVALID_TOKEN" ? (
      <div className="alert alertError">{t(locale, "errors.INVALID_TOKEN")}</div>
    ) : errorCode ? (
      <div className="alert alertError">{t(locale, `errors.${errorCode}`)}</div>
    ) : null;

  return (
    <div className="authPage">
      <aside className="authBrand">
        <span className="authBrandName">{t(locale, "app.name")}</span>
        <p className="authBrandCopy">{t(locale, "activate.subtitle")}</p>
      </aside>

      <form className="authPanel" onSubmit={handleSubmit} noValidate>
        <div>
          <h1 className="authTitle">{t(locale, "activate.title")}</h1>
          <p className="authSubtitle">{t(locale, "activate.subtitle")}</p>
        </div>

        {invalidPanel}

        <label className="field">
          <span className="fieldLabel">{t(locale, "activate.passwordLabel")}</span>
          <input
            className="fieldInput"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="fieldLabel">{t(locale, "activate.confirmLabel")}</span>
          <input
            className="fieldInput"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </label>

        <button className="button" type="submit" disabled={submitting}>
          {submitting ? t(locale, "activate.submitting") : t(locale, "activate.submit")}
        </button>
      </form>
    </div>
  );
}
