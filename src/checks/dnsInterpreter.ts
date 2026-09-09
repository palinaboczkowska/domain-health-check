import type { CheckResult } from "./types.js";

export interface RawDnsInfo {
  nsFound: boolean;
  a: string[] | null;
  aaaa: string[] | null;
  mx: { exchange: string; priority: number }[] | null;
}

/**
 * Node's `dns` module doesn't distinguish "this domain doesn't exist at all"
 * from "this domain exists but has no records of this type" — both surface
 * as ENOTFOUND/ENODATA. NS resolution is used as the "does this domain exist
 * at all" signal; a missing A/AAAA record at the apex with NS present is
 * treated as a softer warning (the site may only be configured on a
 * subdomain like www), not a hard failure.
 */
export function interpretDns(
  raw: RawDnsInfo,
): Omit<CheckResult, "checkId" | "checkName" | "checkedAt"> {
  if (!raw.nsFound) {
    return {
      status: "critical",
      summary: "No nameservers found — this domain does not appear to exist",
      details: { nsFound: false },
    };
  }

  const hasAddress = Boolean(raw.a?.length) || Boolean(raw.aaaa?.length);

  return {
    status: hasAddress ? "ok" : "warning",
    summary: hasAddress
      ? "Domain resolves to an address"
      : "Domain has nameservers but no A/AAAA record at the apex (it may only be configured on a subdomain like www)",
    details: {
      nsFound: true,
      aRecords: raw.a?.join(", ") ?? null,
      aaaaRecords: raw.aaaa?.join(", ") ?? null,
      mxCount: raw.mx?.length ?? 0,
    },
  };
}
