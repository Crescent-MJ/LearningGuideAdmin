"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import type { ErrorCode } from "@/contracts/envelope";
import type { EmployeeRole } from "@/contracts/employee";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/messages";
import { useLocale } from "@/lib/i18n/useLocale";
import {
  canAccessEmployeeAccount,
  employeeAccountHref,
  menuFromPathSegments,
  menuHref,
  visibleMenus,
  type MenuKey,
} from "@/modules/rbac/permissions";

const MENU_ICON: Record<MenuKey, string> = {
  course: "▤",
  knowledge: "▦",
  aiTutor: "◆",
  order: "▣",
  reporting: "▥",
  student: "●",
  helpDesk: "◈",
  settings: "⚙",
};

const MENU_LABEL: Record<MenuKey, string> = {
  course: "nav.course",
  knowledge: "nav.knowledge",
  aiTutor: "nav.aiTutor",
  order: "nav.order",
  reporting: "nav.reporting",
  student: "nav.student",
  helpDesk: "nav.helpDesk",
  settings: "nav.settings",
};

export type ShellEmployee = {
  displayName: string;
  loginEmail: string;
  role: EmployeeRole;
};

export function AppShell({
  employee,
  children,
}: {
  employee: ShellEmployee;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname() ?? `/${locale}/course`;
  const activeMenu = menuFromPathSegments(pathname.split("/").filter(Boolean).slice(1));
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const menus = visibleMenus(employee.role);

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.replace(`/${locale}/sign-in`);
    router.refresh();
  }

  return (
    <div className={collapsed ? "shell shellCollapsed" : "shell"}>
      <nav className="sidebar" aria-label={t(locale, "app.subtitle")}>
        <div className="sidebarBrand">
          {collapsed ? null : <span>{t(locale, "app.name")}</span>}
          <button
            type="button"
            className="sidebarToggle"
            aria-label={t(locale, collapsed ? "shell.expand" : "shell.collapse")}
            title={t(locale, collapsed ? "shell.expand" : "shell.collapse")}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        {menus.map((menu) => (
          <a
            key={menu}
            className={menu === activeMenu ? "navItem navItemActive" : "navItem"}
            href={menuHref(locale, menu)}
            title={t(locale, MENU_LABEL[menu])}
          >
            <span className="navIcon" aria-hidden="true">
              {MENU_ICON[menu]}
            </span>
            {collapsed ? null : <span>{t(locale, MENU_LABEL[menu])}</span>}
          </a>
        ))}
      </nav>

      <div className="main">
        <header className="header">
          {/* PORT-NAV-001：共享顶部栏展示 logo 与产品名 */}
          <span className="headerBrand">
            <span className="brandMark" aria-hidden="true">
              LG
            </span>
            {t(locale, "app.name")}
            <span className="headerBrandSub">
              {activeMenu ? t(locale, MENU_LABEL[activeMenu]) : t(locale, "app.subtitle")}
            </span>
          </span>

          <div className="headerRight">
            <LocaleSwitch persist />

            <span className="employeeName">{employee.displayName}</span>
            <span className="roleTag">{t(locale, `roles.${employee.role}`)}</span>

            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="button buttonGhost buttonSmall"
                onClick={() => setMenuOpen((value) => !value)}
              >
                {t(locale, "shell.employeeMenu")} ▾
              </button>

              {menuOpen ? (
                <div
                  className="card"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    width: 220,
                    padding: 8,
                    zIndex: 40,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div className="modalHint" style={{ padding: "6px 8px" }}>
                    {employee.loginEmail}
                  </div>
                  <button
                    type="button"
                    className="navItem"
                    style={{ color: "var(--text)" }}
                    onClick={() => {
                      setMenuOpen(false);
                      setPasswordOpen(true);
                    }}
                  >
                    {t(locale, "shell.changePassword")}
                  </button>
                  {canAccessEmployeeAccount(employee.role) ? (
                    <a
                      className="navItem"
                      style={{ color: "var(--text)" }}
                      href={employeeAccountHref(locale)}
                    >
                      {t(locale, "nav.employeeAccount")}
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="navItem"
                    style={{ color: "var(--danger)" }}
                    onClick={() => void signOut()}
                  >
                    {t(locale, "shell.signOut")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>

      {passwordOpen ? (
        <ChangePasswordDialog locale={locale} onClose={() => setPasswordOpen(false)} />
      ) : null}
    </div>
  );
}

function ChangePasswordDialog({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorCode(null);

    if (newPassword !== confirmPassword) {
      setErrorCode("PASSWORD_MISMATCH");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword, locale }),
      });
      const payload = (await response.json()) as { success: boolean; error: ErrorCode | null };
      if (!payload.success) {
        setErrorCode(payload.error ?? "INTERNAL_ERROR");
        return;
      }
      // PORT-PWD-006：改密后必须重新登录
      router.replace(`/${locale}/sign-in`);
      router.refresh();
    } catch {
      setErrorCode("INTERNAL_ERROR");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modalBackdrop">
      <form className="modal" onSubmit={submit} noValidate>
        <h2 className="modalTitle">{t(locale, "changePassword.title")}</h2>

        {errorCode ? (
          <div className="alert alertError">{t(locale, `errors.${errorCode}`)}</div>
        ) : null}

        <label className="field">
          <span className="fieldLabel">{t(locale, "changePassword.currentLabel")}</span>
          <input
            className="fieldInput"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="fieldLabel">{t(locale, "changePassword.newLabel")}</span>
          <input
            className="fieldInput"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="fieldLabel">{t(locale, "changePassword.confirmLabel")}</span>
          <input
            className="fieldInput"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </label>

        <div className="modalFooter">
          <button type="button" className="button buttonGhost" onClick={onClose}>
            {t(locale, "common.cancel")}
          </button>
          <button type="submit" className="button" disabled={submitting}>
            {submitting ? t(locale, "changePassword.submitting") : t(locale, "changePassword.submit")}
          </button>
        </div>
      </form>
    </div>
  );
}
