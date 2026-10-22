import { appBaseUrl } from "@/lib/env";
import { ACTIVATION_TOKEN_HOURS, RESET_TOKEN_HOURS } from "@/lib/securityPolicy";
import * as tokenRepository from "@/repositories/tokenRepository";
import type { TokenPurpose } from "@/repositories/tokenRepository";
import { generateRawToken, hashToken } from "@/modules/user-authentication/services/tokenHash";

export type TokenState = "USABLE" | "NOT_FOUND" | "USED" | "REVOKED" | "EXPIRED";

function expiryFor(purpose: TokenPurpose): Date {
  const hours = purpose === "ACTIVATION" ? ACTIVATION_TOKEN_HOURS : RESET_TOKEN_HOURS;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export async function issueActivationToken(employeeId: string): Promise<string> {
  const raw = generateRawToken();
  await tokenRepository.issueToken({
    employeeId,
    purpose: "ACTIVATION",
    tokenHash: hashToken(raw),
    expiresAt: expiryFor("ACTIVATION"),
  });
  return raw;
}

export async function issueResetToken(employeeId: string): Promise<string> {
  const raw = generateRawToken();
  await tokenRepository.issueToken({
    employeeId,
    purpose: "PASSWORD_RESET",
    tokenHash: hashToken(raw),
    expiresAt: expiryFor("PASSWORD_RESET"),
  });
  return raw;
}

export function activationLink(locale: string, rawToken: string): string {
  return `${appBaseUrl()}/${locale}/activate?token=${encodeURIComponent(rawToken)}`;
}

export function resetLink(locale: string, rawToken: string): string {
  return `${appBaseUrl()}/${locale}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

export async function inspectToken(
  rawToken: string,
  purpose: TokenPurpose
): Promise<{ state: TokenState; employeeId: string | null; tokenId: string | null }> {
  const record = await tokenRepository.findByHash(hashToken(rawToken), purpose);
  if (!record) return { state: "NOT_FOUND", employeeId: null, tokenId: null };
  if (record.consumedAt) {
    return { state: "USED", employeeId: record.employeeId, tokenId: record.tokenId };
  }
  if (record.revokedAt) {
    return { state: "REVOKED", employeeId: record.employeeId, tokenId: record.tokenId };
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    return { state: "EXPIRED", employeeId: record.employeeId, tokenId: record.tokenId };
  }
  return { state: "USABLE", employeeId: record.employeeId, tokenId: record.tokenId };
}

/** 单次消费：并发请求只有一个能成功（INV-ONE-USE-TOKEN）。 */
export async function consumeOnce(tokenId: string): Promise<boolean> {
  return tokenRepository.consumeToken(tokenId);
}

export async function revokeTokensForEmployee(
  employeeId: string,
  purpose?: TokenPurpose
): Promise<void> {
  await tokenRepository.revokeOutstandingTokens(employeeId, purpose ?? undefined);
}
