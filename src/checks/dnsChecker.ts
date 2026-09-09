import { promises as dns } from "node:dns";
import { interpretDns, type RawDnsInfo } from "./dnsInterpreter.js";
import type { CheckResult, DomainChecker } from "./types.js";

async function resolveOrNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    // ENOTFOUND/ENODATA for this specific record type is a normal, expected
    // outcome here -- not every domain has MX or AAAA records, for example.
    return null;
  }
}

export function createDnsChecker(): DomainChecker {
  return {
    checkId: "dns",
    checkName: "DNS",
    async run(domain: string): Promise<CheckResult> {
      const ns = await resolveOrNull(dns.resolveNs(domain));
      const a = await resolveOrNull(dns.resolve4(domain));
      const aaaa = await resolveOrNull(dns.resolve6(domain));
      const mx = await resolveOrNull(dns.resolveMx(domain));

      const raw: RawDnsInfo = {
        nsFound: Boolean(ns && ns.length > 0),
        a,
        aaaa,
        mx,
      };
      const interpreted = interpretDns(raw);

      return {
        checkId: "dns",
        checkName: "DNS",
        checkedAt: new Date().toISOString(),
        ...interpreted,
      };
    },
  };
}
