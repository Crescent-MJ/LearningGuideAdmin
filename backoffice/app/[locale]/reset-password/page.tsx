"use client";

import { useState } from "react";

import type { ErrorCode } from "@/contracts/envelope";
import { t } from "@/lib/i18n/messages";
import { useLocale } from "@/lib/i18n/useLocale";
import { useQueryToken } from "@/lib/useQueryToken";

const TERMINAL_CODES: readonly ErrorCode[] = [
  "TOKEN_EXPIRED",
  "TOKEN_ALREADY_USED",
  "INVALID_TOKEN",
];

export default function ResetPasswordPage() {
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
      const response = await fetch("/api/auth/reset-password", {
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

  const terminal =
    errorCode !== null && TERMINAL_CODES.includes(errorCode)
      ? errorCode
      : !ready
        ? "LOADING"
        : token === ""
          ? "INVALID_TOKEN"
          : null;

  if (terminal === "LOADING") {
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

  if (terminal !== null) {
    const titleKey =
      terminal === "TOKEN_EXPIRED"
        ? "reset.expiredTitle"
        : terminal === "TOKEN_ALREADY_USED"
          ? "reset.usedTitle"
          : "reset.invalidTitle";
    const bodyKey =
      terminal === "TOKEN_EXPIRED"
        ? "reset.expiredBody"
        : terminal === "TOKEN_ALREADY_USED"
          ? "reset.usedBody"
          : "reset.invalidBody";

    return (
      <div className="authPage">
        <aside className="authBrand">
          <span className="authBrandName">{t(locale, "app.name")}</span>
        </aside>
        <div className="authPanel">
          <h1 className="authTitle">{t(locale, titleKey)}</h1>
          <p className="authSubtitle">{t(locale, bodyKey)}</p>
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
          <h1 className="authTitle">{t(locale, "reset.successTitle")}</h1>
          <p className="authSubtitle">{t(locale, "reset.successBody")}</p>
          <a className="button" href={`/${locale}/sign-in`}>
            {t(locale, "activate.goSignIn")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="authPage">
      <aside className="authBrand">
        <span className="authBrandName">{t(locale, "app.name")}</span>
        <p className="authBrandCopy">{t(locale, "reset.subtitle")}</p>
      </aside>

      <form className="authPanel" onSubmit={handleSubmit} noValidate>
        <div>
          <h1 className="authTitle">{t(locale, "reset.title")}</h1>
          <p className="authSubtitle">{t(locale, "reset.subtitle")}</p>
        </div>

        {errorCode ? (
          <div className="alert alertError">{t(locale, `errors.${errorCode}`)}</div>
        ) : null}

        <label className="field">
          <span className="fieldLabel">{t(locale, "reset.passwordLabel")}</span>
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
          <span className="fieldLabel">{t(locale, "reset.confirmLabel")}</span>
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
          {submitting ? t(locale, "reset.submitting") : t(locale, "reset.submit")}
        </button>
      </form>
    </div>
  );
}
