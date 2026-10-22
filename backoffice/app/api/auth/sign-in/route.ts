import { NextResponse } from "next/server";

import { ok, type Envelope } from "@/contracts/envelope";
import type { SessionEmployee } from "@/contracts/employee";
import { clientIp, jsonFail, readJson, readString } from "@/lib/http";
import { RATE_LIMIT_WINDOW_MINUTES, SIGN_IN_MAX_PER_WINDOW } from "@/lib/securityPolicy";
import { consume } from "@/lib/rateLimit";
import { sessionCookieOptions } from "@/lib/sessionCookie";
import { signIn } from "@/modules/user-authentication/services/signIn";

/** PORT-LOG-004 / PORT-LOG-005：登录成功即建立服务端会话。 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  if (!body) return jsonFail("INVALID_INPUT", "Malformed request body");

  const ip = clientIp(request);
  const limit = consume(`sign-in:${ip}`, SIGN_IN_MAX_PER_WINDOW, RATE_LIMIT_WINDOW_MINUTES);
  if (!limit.allowed) return jsonFail("RATE_LIMITED", "Too many sign-in attempts");

  try {
    const outcome = await signIn({
      rawEmail: readString(body, "email"),
      password: readString(body, "password"),
      ipAddress: ip,
      userAgent: request.headers.get("user-agent"),
    });

    if (!outcome.ok) return jsonFail(outcome.code, "Sign-in rejected");

    const response = NextResponse.json<Envelope<{ employee: SessionEmployee }>>(
      ok({ employee: outcome.employee }),
      { status: 200 }
    );
    response.cookies.set({
      ...sessionCookieOptions(outcome.maxAgeSeconds),
      value: outcome.token,
    });
    return response;
  } catch {
    return jsonFail("INTERNAL_ERROR", "Unable to complete sign-in");
  }
}
