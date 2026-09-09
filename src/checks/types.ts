export type CheckStatus = "ok" | "warning" | "critical" | "unavailable" | "unknown";

export interface CheckResult {
  checkId: string;
  checkName: string;
  status: CheckStatus;
  summary: string;
  details: Record<string, string | number | boolean | null>;
  checkedAt: string;
  /** Present only for "unknown" — an unexpected failure, not a structural non-check. */
  error?: string;
}

export interface DomainHealthReport {
  domain: string;
  checkedAt: string;
  checks: CheckResult[];
}

/**
 * Something that can check one aspect of a domain's health. `run` is allowed
 * to throw for genuine, unexpected failures — the orchestrator
 * (domainHealthService.ts) is what maps those to "unknown", exactly once,
 * not each checker individually.
 */
export interface DomainChecker {
  readonly checkId: string;
  readonly checkName: string;
  run(domain: string): Promise<CheckResult>;
}
