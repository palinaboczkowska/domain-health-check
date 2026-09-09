import type { CheckResult, DomainChecker, DomainHealthReport } from "../checks/types.js";

export interface DomainHealthServiceOptions {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export interface DomainHealthService {
  checkDomain(domain: string): Promise<DomainHealthReport>;
}

export function createDomainHealthService(
  checkers: DomainChecker[],
  options: DomainHealthServiceOptions = {},
): DomainHealthService {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  /**
   * Never throws. A checker returning "unavailable" (a structural, expected
   * non-check — e.g. the registration checker on a TLD outside IANA's RDAP
   * bootstrap) is passed through completely unchanged, since it's a normal
   * `CheckResult`, not an exception. Only a genuine exception or timeout is
   * remapped here, to "unknown".
   */
  async function runOne(checker: DomainChecker, domain: string): Promise<CheckResult> {
    try {
      return await withTimeout(
        checker.run(domain),
        timeoutMs,
        `${checker.checkName} check timed out after ${timeoutMs}ms`,
      );
    } catch (error) {
      return {
        checkId: checker.checkId,
        checkName: checker.checkName,
        status: "unknown",
        summary: "Could not complete this check",
        details: {},
        checkedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return {
    async checkDomain(domain: string): Promise<DomainHealthReport> {
      const settled = await Promise.allSettled(
        checkers.map((checker) => runOne(checker, domain)),
      );

      const checks: CheckResult[] = settled.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        }
        // runOne never rejects; this branch is belt-and-suspenders against a
        // future checker forgetting its own try/catch, not an expected path.
        const checker = checkers[index]!;
        return {
          checkId: checker.checkId,
          checkName: checker.checkName,
          status: "unknown",
          summary: "Could not complete this check",
          details: {},
          checkedAt: new Date().toISOString(),
          error:
            result.reason instanceof Error ? result.reason.message : String(result.reason),
        };
      });

      return { domain, checkedAt: new Date().toISOString(), checks };
    },
  };
}
