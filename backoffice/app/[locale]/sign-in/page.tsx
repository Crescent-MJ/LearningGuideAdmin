"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ErrorCode } from "@/contracts/envelope";
import { AuthLayout } from "@/components/AuthLayout";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/messages";
import { useLocale } from "@/lib/i18n/useLocale";

type EmailCheckState = "idle" | "checking" | "eligible" | "notEligible";
type Step = "email" | "password";

const EMAIL_CHECK_DELAY_MS = 500;
const PORTAL_URL = "https://www.ilovelearningguide.com";

export default function SignInPage() {
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
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

  /** PORT-LOG-002 / PORT-LOG-003：先校验邮箱，通过后才进入密码步骤。 */
  async function handleEmailStep(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorCode(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/email-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        data: { eligible: boolean } | null;
        error: ErrorCode | null;
      };
      if (!payload.success) {
        setErrorCode(payload.error ?? "INTERNAL_ERROR");
        return;
      }
      if (!payload.data?.eligible) {
        setEmailState("notEligible");
        setErrorCode("INVALID_EMPLOYEE_ACCOUNT");
        return;
      }
      setEmailState("eligible");
      setStep("password");
    } catch {
      setErrorCode("INTERNAL_ERROR");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordStep(event: React.FormEvent<HTMLFormElement>) {
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

  const backHref = `${PORTAL_URL}/${locale}/portal`;
  const backLabel = t(locale, "signIn.portalBack");

  const errorAlert = errorCode ? (
    <div className="alert alertError">{t(locale, `errors.${errorCode}`)}</div>
  ) : null;

  if (step === "email") {
    return (
      <AuthLayout
        title={t(locale, "signIn.title")}
        subtitle={t(locale, "signIn.emailStepSubtitle")}
        backHref={backHref}
        backLabel={backLabel}
        showLegal
      >
        <form onSubmit={handleEmailStep} noValidate>
          <div className="field" style={{ marginBottom: 14 }}>
            <span className="fieldLabel">{t(locale, "signIn.emailLabel")}</span>
            <div className="inputRow">
              <input
                className="fieldInput"
                type="email"
                name="email"
                autoComplete="username"
                autoFocus
                placeholder={t(locale, "signIn.emailPlaceholder")}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrorCode(null);
                }}
                required
              />
              <button className="button" type="submit" disabled={submitting}>
                {submitting ? t(locale, "common.loading") : t(locale, "signIn.continue")}
              </button>
            </div>
          </div>

          <div className="hintRow">
            {emailState === "checking" ? (
              <span className="hintMuted">{t(locale, "signIn.checking")}</span>
            ) : null}
            {emailState === "eligible" ? (
              <span className="hintOk">✓ {t(locale, "signIn.validEmployee")}</span>
            ) : null}
            {emailState === "notEligible" && !errorCode ? (
              <span className="hintBad">! {t(locale, "signIn.invalidEmployee")}</span>
            ) : null}
          </div>

          {errorAlert}

          <p className="modalHint" style={{ marginTop: 12 }}>
            {t(locale, "signIn.subtitle")}
          </p>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t(locale, "signIn.title")}
      subtitle={email}
      backHref={backHref}
      backLabel={backLabel}
      showLegal
    >
      <form onSubmit={handlePasswordStep} noValidate>
        {errorAlert}

        <div className="field" style={{ marginBottom: 14 }}>
          <span className="fieldLabel">{t(locale, "signIn.passwordLabel")}</span>
          <div className="inputRow">
            <input
              className="fieldInput"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              autoFocus
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
        </div>

        <button className="button" type="submit" disabled={submitting} style={{ width: "100%" }}>
          {submitting ? t(locale, "signIn.submitting") : t(locale, "signIn.submit")}
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 12,
            fontSize: 13,
          }}
        >
          <button
            type="button"
            className="linkButton"
            onClick={() => {
              setStep("email");
              setPassword("");
              setErrorCode(null);
            }}
          >
            ← {t(locale, "signIn.changeEmail")}
          </button>
          <a className="linkButton" href={`/${locale}/forgot-password`}>
            {t(locale, "signIn.forgotPassword")}
          </a>
        </div>
      </form>
    </AuthLayout>
  );
}
