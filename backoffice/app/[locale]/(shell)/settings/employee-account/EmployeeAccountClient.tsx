"use client";

import { useCallback, useEffect, useState } from "react";

import type { ErrorCode } from "@/contracts/envelope";
import {
  DISPLAY_STATUSES,
  EMPLOYEE_ROLES,
  type AccountStatus,
  type EmployeeRole,
} from "@/contracts/employee";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/messages";
import type { EmployeeListItem, EmployeeListResult } from "@/modules/employee-account/services/employeeAccount";

const PAGE_SIZE = 10;

type Filters = { email: string; role: string; status: string };

type EditorState =
  | { mode: "create"; email: string; role: EmployeeRole; accountStatus: AccountStatus }
  | { mode: "edit"; employee: EmployeeListItem; email: string; role: EmployeeRole; accountStatus: AccountStatus }
  | null;

export function EmployeeAccountClient({ locale }: { locale: Locale }) {
  const [filters, setFilters] = useState<Filters>({ email: "", role: "", status: "" });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({
    email: "",
    role: "",
    status: "",
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<EmployeeListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (appliedFilters.email.trim() !== "") params.set("email", appliedFilters.email.trim());
      if (appliedFilters.role !== "") params.set("role", appliedFilters.role);
      if (appliedFilters.status !== "") params.set("status", appliedFilters.status);

      const response = await fetch(`/api/admin/employees?${params.toString()}`);
      const payload = (await response.json()) as {
        success: boolean;
        data: EmployeeListResult | null;
        error: ErrorCode | null;
      };
      if (!payload.success || !payload.data) {
        setErrorCode(payload.error ?? "INTERNAL_ERROR");
        return;
      }
      setData(payload.data);
    } catch {
      setErrorCode("INTERNAL_ERROR");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitEditor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    setSubmitting(true);
    setErrorCode(null);

    try {
      const isCreate = editor.mode === "create";
      const url = isCreate
        ? "/api/admin/employees"
        : `/api/admin/employees/${editor.employee.employeeId}`;
      const body = isCreate
        ? { email: editor.email, role: editor.role, accountStatus: editor.accountStatus, locale }
        : { email: editor.email, role: editor.role, accountStatus: editor.accountStatus, locale };

      const response = await fetch(url, {
        method: isCreate ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {
        success: boolean;
        data: { delivery?: string } | null;
        error: ErrorCode | null;
      };
      if (!payload.success) {
        setErrorCode(payload.error ?? "INTERNAL_ERROR");
        return;
      }

      setNotice(
        isCreate
          ? t(locale, "employees.results.created")
          : t(locale, "employees.results.updated")
      );
      setEditor(null);
      await load();
    } catch {
      setErrorCode("INTERNAL_ERROR");
    } finally {
      setSubmitting(false);
    }
  }

  async function runAction(
    employee: EmployeeListItem,
    action: "reset-password" | "resend-activation"
  ) {
    setErrorCode(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/employees/${employee.employeeId}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        data: { delivery: string } | null;
        error: ErrorCode | null;
      };
      if (!payload.success) {
        setErrorCode(payload.error ?? "INTERNAL_ERROR");
        return;
      }
      const delivery = payload.data?.delivery ?? "UNKNOWN";
      setNotice(
        action === "reset-password"
          ? t(locale, "employees.results.resetSent", { result: delivery })
          : t(locale, "employees.results.resent")
      );
      await load();
    } catch {
      setErrorCode("INTERNAL_ERROR");
    }
  }

  const from = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <section className="card">
      <div className="toolbar">
        <h1 className="cardTitle" style={{ margin: 0 }}>
          {t(locale, "employees.title")}
        </h1>
        <div className="toolbarSpacer" />
        <button
          type="button"
          className="button"
          onClick={() =>
            setEditor({
              mode: "create",
              email: "",
              role: "COURSE_CREATOR",
              accountStatus: "ACTIVE",
            })
          }
        >
          {t(locale, "employees.addEmployee")}
        </button>
      </div>

      <p className="cardBody" style={{ marginBottom: 16 }}>
        {t(locale, "employees.subtitle")}
      </p>

      <div className="toolbar">
        <input
          className="fieldInput"
          style={{ maxWidth: 260 }}
          placeholder={t(locale, "employees.searchPlaceholder")}
          value={filters.email}
          onChange={(event) => setFilters({ ...filters, email: event.target.value })}
        />
        <select
          className="fieldSelect"
          style={{ maxWidth: 190 }}
          value={filters.role}
          onChange={(event) => setFilters({ ...filters, role: event.target.value })}
        >
          <option value="">{t(locale, "employees.allRoles")}</option>
          {EMPLOYEE_ROLES.map((role) => (
            <option key={role} value={role}>
              {t(locale, `roles.${role}`)}
            </option>
          ))}
        </select>
        <select
          className="fieldSelect"
          style={{ maxWidth: 170 }}
          value={filters.status}
          onChange={(event) => setFilters({ ...filters, status: event.target.value })}
        >
          <option value="">{t(locale, "employees.allStatus")}</option>
          {DISPLAY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(locale, `status.${status}`)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="button buttonGhost"
          onClick={() => {
            setPage(1);
            setAppliedFilters(filters);
          }}
        >
          {t(locale, "common.search")}
        </button>
        <button
          type="button"
          className="button buttonGhost"
          onClick={() => {
            const cleared = { email: "", role: "", status: "" };
            setFilters(cleared);
            setAppliedFilters(cleared);
            setPage(1);
          }}
        >
          {t(locale, "common.reset")}
        </button>
      </div>

      {errorCode ? <div className="alert alertError">{t(locale, `errors.${errorCode}`)}</div> : null}
      {notice ? <div className="alert alertOk">{notice}</div> : null}

      <table className="table">
        <thead>
          <tr>
            <th>{t(locale, "employees.columns.email")}</th>
            <th>{t(locale, "employees.columns.role")}</th>
            <th>{t(locale, "employees.columns.status")}</th>
            <th>{t(locale, "employees.columns.lastLogin")}</th>
            <th>{t(locale, "employees.columns.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5}>{t(locale, "common.loading")}</td>
            </tr>
          ) : null}

          {!loading && data && data.items.length === 0 ? (
            <tr>
              <td colSpan={5}>{t(locale, "employees.empty")}</td>
            </tr>
          ) : null}

          {!loading && data
            ? data.items.map((employee) => (
                <tr key={employee.employeeId}>
                  <td>{employee.loginEmail}</td>
                  <td>{t(locale, `roles.${employee.role}`)}</td>
                  <td>
                    <span className="statusPill">
                      <span
                        className={
                          employee.displayStatus === "Active"
                            ? "dot dotActive"
                            : employee.displayStatus === "Pending"
                              ? "dot dotPending"
                              : "dot dotInactive"
                        }
                        aria-hidden="true"
                      />
                      {t(locale, `status.${employee.displayStatus}`)}
                    </span>
                  </td>
                  <td>
                    {employee.lastLoginAt
                      ? new Date(employee.lastLoginAt).toISOString().slice(0, 16).replace("T", " ")
                      : t(locale, "employees.neverSignedIn")}
                  </td>
                  <td>
                    <div className="rowActions">
                      <button
                        type="button"
                        className="button buttonGhost buttonSmall"
                        onClick={() =>
                          setEditor({
                            mode: "edit",
                            employee,
                            email: employee.loginEmail,
                            role: employee.role,
                            accountStatus: employee.accountStatus,
                          })
                        }
                      >
                        {t(locale, "employees.actions.edit")}
                      </button>
                      <button
                        type="button"
                        className="button buttonGhost buttonSmall"
                        onClick={() => void runAction(employee, "reset-password")}
                      >
                        {t(locale, "employees.actions.resetPassword")}
                      </button>
                      {employee.displayStatus === "Pending" ? (
                        <button
                          type="button"
                          className="button buttonGhost buttonSmall"
                          onClick={() => void runAction(employee, "resend-activation")}
                        >
                          {t(locale, "employees.actions.resendActivation")}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            : null}
        </tbody>
      </table>

      <div className="pagination">
        <span>{t(locale, "employees.showing", { from, to, total: data?.total ?? 0 })}</span>
        <span className="rowActions">
          <button
            type="button"
            className="button buttonGhost buttonSmall"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            {t(locale, "common.previous")}
          </button>
          <button
            type="button"
            className="button buttonGhost buttonSmall"
            disabled={!data || page * data.pageSize >= data.total}
            onClick={() => setPage((value) => value + 1)}
          >
            {t(locale, "common.next")}
          </button>
        </span>
      </div>

      {editor ? (
        <div className="modalBackdrop">
          <form className="modal" onSubmit={submitEditor} noValidate>
            <h2 className="modalTitle">
              {editor.mode === "create"
                ? t(locale, "employees.newTitle")
                : t(locale, "employees.editTitle")}
            </h2>

            {errorCode ? (
              <div className="alert alertError">{t(locale, `errors.${errorCode}`)}</div>
            ) : null}

            <label className="field">
              <span className="fieldLabel">{t(locale, "employees.fields.email")}</span>
              <input
                className="fieldInput"
                type="email"
                value={editor.email}
                disabled={editor.mode === "edit" && editor.employee.emailVerification === "VERIFIED"}
                onChange={(event) =>
                  setEditor((current) => (current ? { ...current, email: event.target.value } : current))
                }
                required
              />
              {editor.mode === "edit" && editor.employee.emailVerification === "VERIFIED" ? (
                <span className="modalHint">{t(locale, "employees.hintEmailLocked")}</span>
              ) : null}
            </label>

            <label className="field">
              <span className="fieldLabel">{t(locale, "employees.fields.role")}</span>
              <select
                className="fieldSelect"
                value={editor.role}
                disabled={editor.mode === "edit" && editor.employee.isBootstrapAdmin}
                onChange={(event) =>
                  setEditor((current) =>
                    current ? { ...current, role: event.target.value as EmployeeRole } : current
                  )
                }
              >
                {EMPLOYEE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {t(locale, `roles.${role}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="fieldLabel">{t(locale, "employees.fields.status")}</span>
              <select
                className="fieldSelect"
                value={editor.accountStatus}
                disabled={editor.mode === "edit" && editor.employee.isBootstrapAdmin}
                onChange={(event) =>
                  setEditor((current) =>
                    current
                      ? { ...current, accountStatus: event.target.value as AccountStatus }
                      : current
                  )
                }
              >
                <option value="ACTIVE">{t(locale, "status.Active")}</option>
                <option value="INACTIVE">{t(locale, "status.Inactive")}</option>
              </select>
              {editor.mode === "edit" && editor.employee.isBootstrapAdmin ? (
                <span className="modalHint">{t(locale, "employees.bootstrapLocked")}</span>
              ) : null}
            </label>

            <div className="modalFooter">
              <button type="button" className="button buttonGhost" onClick={() => setEditor(null)}>
                {t(locale, "common.cancel")}
              </button>
              <button type="submit" className="button" disabled={submitting}>
                {editor.mode === "create"
                  ? submitting
                    ? t(locale, "common.creating")
                    : t(locale, "common.create")
                  : submitting
                    ? t(locale, "common.saving")
                    : t(locale, "common.save")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
