import { cookies } from "next/headers";

import type { SessionEmployee } from "@/contracts/employee";
import { SESSION_COOKIE_NAME } from "@/lib/sessionCookie";
import { canAccessEmployeeAccount } from "@/modules/rbac/permissions";
import { resolveSession } from "@/modules/user-authentication/services/session";

/** 服务端组件与 Route Handler 共用的会话入口（PRD PORT-SES-001）。 */
export async function currentEmployee(): Promise<SessionEmployee | null> {
  const store = await cookies();
  return resolveSession(store.get(SESSION_COOKIE_NAME)?.value);
}

export async function currentSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * PRD §3.3：Employee Account Management 仅 Admin。
 * 服务端判定，前端隐藏菜单只是展示层。
 */
export async function currentAdminEmployee(): Promise<SessionEmployee | null> {
  const employee = await currentEmployee();
  if (!employee) return null;
  return canAccessEmployeeAccount(employee.role) ? employee : null;
}
