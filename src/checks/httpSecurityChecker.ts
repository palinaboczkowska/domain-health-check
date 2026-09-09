import { interpretHttpSecurity, type RawHttpSecurityInfo } from "./httpSecurityInterpreter.js";
import type { CheckResult, DomainChecker } from "./types.js";

/** Only checks the bare apex domain -- see httpSecurityInterpreter.ts's note. */
export function createHttpSecurityChecker(): DomainChecker {
  return {
    checkId: "httpSecurity",
    checkName: "HTTP Security",
    async run(domain: string): Promise<CheckResult> {
      let httpRedirectsToHttps = false;
      try {
        // redirect: "manual" is what lets us inspect the 3xx status and
        // Location header ourselves instead of Node silently following it.
        const httpResponse = await fetch(`http://${domain}`, { redirect: "manual" });
        const location = httpResponse.headers.get("location") ?? "";
        httpRedirectsToHttps =
          httpResponse.status >= 300 &&
          httpResponse.status < 400 &&
          location.startsWith("https://");
      } catch {
        httpRedirectsToHttps = false;
      }

      let httpsReachable = false;
      let hstsHeaderValue: string | null = null;
      try {
        const httpsResponse = await fetch(`https://${domain}`);
        httpsReachable = true;
        hstsHeaderValue = httpsResponse.headers.get("strict-transport-security");
      } catch {
        httpsReachable = false;
      }

      const raw: RawHttpSecurityInfo = { httpRedirectsToHttps, httpsReachable, hstsHeaderValue };
      const interpreted = interpretHttpSecurity(raw);

      return {
        checkId: "httpSecurity",
        checkName: "HTTP Security",
        checkedAt: new Date().toISOString(),
        ...interpreted,
      };
    },
  };
}
