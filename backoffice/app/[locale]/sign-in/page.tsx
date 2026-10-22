"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ErrorCode } from "@/contracts/envelope";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import type { Locale } from "@/lib/i18n/config";
import { getMessages, t } from "@/lib/i18n/messages";
import { useLocale } from "@/lib/i18n/useLocale";

type EmailCheckState = "idle" | "checking" | "eligible" | "notEligible";

const EMAIL_CHECK_DELAY_MS = 500;

export default function SignInPage() {
  const locale = useLocale();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailState, setEmailState] = useState<EmailCheckState>("idle");
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runEmailCheck = useCallback(async (value: string) => {
    setEmailState("checking");
    try {
      const response = await fetch("/api/auth/email-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        data: { eligible: boolean } | null;
      };
      setEmailState(payload.success && payload.data?.eligible ? "eligible" : "notEligible");
    } catch {
      setEmailState("idle");
    }
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (email.trim() === "") {
      setEmailState("idle");
      return;
    }
    timer.current = setTimeout(() => void runEmailCheck(email), EMAIL_CHECK_DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [email, runEmailCheck]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorCode(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        error: ErrorCode | null;
        data: { locale: Locale } | null;
      };
      if (!payload.success) {
        setErrorCode(payload.error ?? "INTERNAL_ERROR");
        return;
      }
      // PORT-NAV-006：账号偏好优先，服务端已把 Cookie 写成该语言
      const nextLocale = payload.data?.locale ?? locale;
      router.replace(`/${nextLocale}/course`);
      router.refresh();
    } catch {
      setErrorCode("INTERNAL_ERROR");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="authPage">
      <aside className="authBrand">
        <span className="authBrandName">{getMessages(locale).app.name}</span>
        <p className="authBrandCopy">{t(locale, "signIn.subtitle")}</p>
      </aside>

      <form className="authPanel" onSubmit={handleSubmit} noValidate>
        <div className="localeSwitch">
          <span>{t(locale, "common.language")}</span>
          <LocaleSwitch persist={false} />
        </div>

        <div>
          <h1 className="authTitle">{t(locale, "signIn.title")}</h1>
          <p className="authSubtitle">{t(locale, "signIn.subtitle")}</p>
        </div>

        {errorCode ? <div className="alert alertError">{t(locale, `errors.${errorCode}`)}</div> : null}

        <label className="field">
          <span className="fieldLabel">{t(locale, "signIn.emailLabel")}</span>
          <input
            className="fieldInput"
            type="email"
            name="email"
            autoComplete="username"
            placeholder={t(locale, "signIn.emailPlaceholder")}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <div className="hintRow">
          {emailState === "checking" ? (
            <span className="hintMuted">{t(locale, "signIn.checking")}</span>
          ) : null}
          {emailState === "eligible" ? (
            <span className="hintOk">✓ {t(locale, "signIn.validEmployee")}</span>
          ) : null}
          {emailState === "notEligible" ? (
            <span className="hintBad">! {t(locale, "signIn.invalidEmployee")}</span>
          ) : null}
        </div>

        <label className="field">
          <span className="fieldLabel">{t(locale, "signIn.passwordLabel")}</span>
          <div className="inputRow">
            <input
              className="fieldInput"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              placeholder={t(locale, "signIn.passwordPlaceholder")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className="button buttonGhost buttonSmall"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? t(locale, "signIn.hidePassword") : t(locale, "signIn.showPassword")}
            </button>
          </div>
        </label>

        <div>
          <a className="linkButton" href={`/${locale}/forgot-password`}>
            {t(locale, "signIn.forgotPassword")}
          </a>
        </div>

        <button className="button" type="submit" disabled={submitting}>
          {submitting ? t(locale, "signIn.submitting") : t(locale, "signIn.submit")}
        </button>
      </form>
    </div>
  );
}
