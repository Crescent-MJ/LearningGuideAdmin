import { currentEmployee } from "@/lib/currentSession";
import { jsonFail, jsonOk } from "@/lib/http";
import {
  canAccessEmployeeAccount,
  DEFAULT_LANDING_MENU,
  employeeAccountHref,
  menuHref,
  visibleMenus,
} from "@/modules/rbac/permissions";

export type SessionPayload = {
  employee: {
    employeeId: string;
    loginEmail: string;
    displayName: string;
    role: string;
    displayStatus: string;
    isBootstrapAdmin: boolean;
  };
  menus: { key: string; href: string }[];
  canManageEmployeeAccount: boolean;
  employeeAccountHref: string;
  landingHref: string;
};

export async function GET(request: Request): Promise<Response> {
  try {
    const employee = await currentEmployee();
    if (!employee) return jsonFail("INVALID_EMPLOYEE_ACCOUNT", "No active session");

    const locale = new URL(request.url).pathname.split("/")[1] ?? "en-GB";

    return jsonOk<SessionPayload>({
      employee: {
        employeeId: employee.employeeId,
        loginEmail: employee.loginEmail,
        displayName: employee.displayName,
        role: employee.role,
        displayStatus: employee.displayStatus,
        isBootstrapAdmin: employee.isBootstrapAdmin,
      },
      menus: visibleMenus(employee.role).map((menu) => ({
        key: menu,
        href: menuHref(locale, menu),
      })),
      canManageEmployeeAccount: canAccessEmployeeAccount(employee.role),
      employeeAccountHref: employeeAccountHref(locale),
      landingHref: menuHref(locale, DEFAULT_LANDING_MENU),
    });
  } catch {
    return jsonFail("INTERNAL_ERROR", "Unable to read session");
  }
}
