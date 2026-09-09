import { z } from "zod";
import type { CheckResult } from "./types.js";

export const IanaBootstrapSchema = z.object({
  services: z.array(z.tuple([z.array(z.string()), z.array(z.string())])),
});
export type IanaBootstrapFile = z.infer<typeof IanaBootstrapSchema>;

/**
 * Looks up which RDAP server (if any) is authoritative for a TLD, using
 * IANA's own official bootstrap registry — verified live to be missing
 * several real ccTLDs, including Sweden's `.se`. Returning `undefined` here
 * is a normal, expected outcome (mapped to "unavailable" by the checker),
 * not something to guess around with an unofficial endpoint.
 */
export function findRdapBaseUrl(
  bootstrap: IanaBootstrapFile,
  tld: string,
): string | undefined {
  const normalizedTld = tld.toLowerCase();
  for (const [tlds, urls] of bootstrap.services) {
    if (tlds.some((candidate) => candidate.toLowerCase() === normalizedTld)) {
      return urls[0];
    }
  }
  return undefined;
}

const RdapEventSchema = z.object({
  eventAction: z.string(),
  eventDate: z.string(),
});

export const RdapDomainResponseSchema = z.object({
  events: z.array(RdapEventSchema).optional().default([]),
});
export type RdapDomainResponse = z.infer<typeof RdapDomainResponseSchema>;

export interface RegistrationThresholds {
  warningDays: number;
  criticalDays: number;
}

export const DEFAULT_REGISTRATION_THRESHOLDS: RegistrationThresholds = {
  warningDays: 30,
  criticalDays: 7,
};

/**
 * Pure interpretation of a real RDAP domain response. Only called once a
 * base URL was actually found for the domain's TLD — a missing `expiration`
 * event in an otherwise-valid response is treated as "unknown" (unexpected),
 * not "unavailable" (which is reserved for the TLD-not-supported case).
 */
export function interpretRdapResponse(
  raw: unknown,
  now: Date,
  thresholds: RegistrationThresholds = DEFAULT_REGISTRATION_THRESHOLDS,
): Omit<CheckResult, "checkId" | "checkName" | "checkedAt"> {
  const data = RdapDomainResponseSchema.parse(raw);
  const expirationEvent = data.events.find((event) => event.eventAction === "expiration");

  if (!expirationEvent) {
    return {
      status: "unknown",
      summary: "RDAP response did not include an expiration date",
      details: {},
      error: "No 'expiration' event in RDAP response",
    };
  }

  const expiresAt = new Date(expirationEvent.eventDate);
  const daysRemaining = Math.floor(
    (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

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
        ? `Domain registration expired ${Math.abs(daysRemaining)} day(s) ago`
        : `Domain registration expires in ${daysRemaining} day(s)`,
    details: {
      expiresAt: expirationEvent.eventDate,
      daysRemaining,
    },
  };
}

/** The structural "not an error" result for a TLD absent from IANA's bootstrap. */
export function unavailableRegistrationResult(
  tld: string,
): Omit<CheckResult, "checkId" | "checkName" | "checkedAt"> {
  return {
    status: "unavailable",
    summary: `Domain registration data isn't available for the .${tld} TLD (not in IANA's official RDAP registry)`,
    details: { tld },
  };
}
