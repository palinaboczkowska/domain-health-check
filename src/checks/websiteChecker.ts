import { extractWebsiteSummary, interpretWebsiteSummary } from "./websiteInterpreter.js";
import type { CheckResult, DomainChecker } from "./types.js";

const MAX_HTML_BYTES = 512 * 1024;

/** Fetches the home page (following redirects, e.g. to www) and reads only its head tags. */
export function createWebsiteChecker(): DomainChecker {
  return {
    checkId: "website",
    checkName: "Website",
    async run(domain: string): Promise<CheckResult> {
      const response = await fetch(`https://${domain}`, {
        headers: { "User-Agent": "Mozilla/5.0 (domain-health-check)" },
      });
      if (!response.ok) {
        throw new Error(`Home page returned HTTP ${response.status}`);
      }
      const html = (await response.text()).slice(0, MAX_HTML_BYTES);

      return {
        checkId: "website",
        checkName: "Website",
        checkedAt: new Date().toISOString(),
        ...interpretWebsiteSummary(extractWebsiteSummary(html)),
      };
    },
  };
}
