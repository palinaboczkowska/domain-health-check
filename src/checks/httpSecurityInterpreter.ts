import type { CheckResult } from "./types.js";

export interface RawHttpSecurityInfo {
  httpRedirectsToHttps: boolean;
  httpsReachable: boolean;
  hstsHeaderValue: string | null;
}

/**
 * Only checks the bare apex domain, not www.<domain> — a site that only
 * serves HTTPS on the www subdomain will show as unreachable here. A real,
 * documented coverage gap (see README), not a bug.
 */
export function interpretHttpSecurity(
  raw: RawHttpSecurityInfo,
): Omit<CheckResult, "checkId" | "checkName" | "checkedAt"> {
  if (!raw.httpsReachable) {
    return {
      status: "critical",
      summary: "HTTPS is not reachable",
      details: { httpsReachable: false },
    };
  }

  if (!raw.httpRedirectsToHttps) {
    return {
      status: "critical",
      summary: "HTTP does not redirect to HTTPS",
      details: { httpRedirectsToHttps: false, hstsHeaderValue: raw.hstsHeaderValue },
    };
  }

  if (!raw.hstsHeaderValue) {
    return {
      status: "warning",
      summary: "Redirects to HTTPS, but no HSTS header is set",
      details: { httpRedirectsToHttps: true, hstsHeaderValue: null },
    };
  }

  return {
    status: "ok",
    summary: "Redirects to HTTPS and sends an HSTS header",
    details: { httpRedirectsToHttps: true, hstsHeaderValue: raw.hstsHeaderValue },
  };
}
