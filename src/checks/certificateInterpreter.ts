import type { CheckResult } from "./types.js";

export interface RawCertificateInfo {
  validFrom: string;
  validTo: string;
  issuer: Record<string, string>;
  subject: Record<string, string>;
  authorized: boolean;
  authorizationError: string | null;
}

export interface CertificateThresholds {
  warningDays: number;
  criticalDays: number;
}

export const DEFAULT_CERTIFICATE_THRESHOLDS: CertificateThresholds = {
  warningDays: 30,
  criticalDays: 7,
};

/**
 * Pure interpretation of a TLS peer certificate. The checker connects with
 * `rejectUnauthorized: false` specifically so it can reach this function even
 * for an expired or otherwise-untrusted certificate — Node's default
 * behavior aborts the handshake before any of this data is visible.
 */
export function interpretCertificate(
  raw: RawCertificateInfo,
  now: Date,
  thresholds: CertificateThresholds = DEFAULT_CERTIFICATE_THRESHOLDS,
): Omit<CheckResult, "checkId" | "checkName" | "checkedAt"> {
  const validTo = new Date(raw.validTo);
  const daysRemaining = Math.floor(
    (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  const issuerName = raw.issuer.O ?? raw.issuer.CN ?? "unknown issuer";

  if (!raw.authorized && daysRemaining >= 0) {
    // Untrusted for a reason other than expiry (self-signed, hostname
    // mismatch, unknown CA) -- the date-based buckets below already cover
    // the "it's just expired" case.
    return {
      status: "warning",
      summary: `Certificate is not trusted: ${raw.authorizationError ?? "unknown reason"}`,
      details: {
        issuer: issuerName,
        validTo: raw.validTo,
        authorized: raw.authorized,
        authorizationError: raw.authorizationError,
      },
    };
  }

  let status: CheckResult["status"];
  if (daysRemaining <= thresholds.criticalDays) {
    status = "critical";
  } else if (daysRemaining <= thresholds.warningDays) {
    status = "warning";
  } else {
    status = "ok";
  }

  return {
    status,
    summary:
      daysRemaining < 0
        ? `Certificate expired ${Math.abs(daysRemaining)} day(s) ago`
        : `Certificate expires in ${daysRemaining} day(s)`,
    details: { issuer: issuerName, validTo: raw.validTo, daysRemaining },
  };
}

/** Structural result when port 443 can't even be reached (e.g. ECONNREFUSED). */
export function unreachableCertificateResult(
  reason: string,
): Omit<CheckResult, "checkId" | "checkName" | "checkedAt"> {
  return {
    status: "critical",
    summary: "Does not appear to serve HTTPS on port 443",
    details: { reason },
  };
}
