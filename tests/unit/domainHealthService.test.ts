import { describe, expect, it } from "vitest";
import { createDomainHealthService } from "../../src/server/domainHealthService.js";
import type { CheckResult, DomainChecker } from "../../src/checks/types.js";

function makeHealthyChecker(checkId: string): DomainChecker {
  return {
    checkId,
    checkName: checkId,
    async run(): Promise<CheckResult> {
      return {
        checkId,
        checkName: checkId,
        status: "ok",
        summary: "all good",
        details: {},
        checkedAt: new Date().toISOString(),
      };
    },
  };
}

function makeThrowingChecker(checkId: string): DomainChecker {
  return {
    checkId,
    checkName: checkId,
    run(): Promise<CheckResult> {
      throw new Error("boom");
    },
  };
}

function makeHangingChecker(checkId: string): DomainChecker {
  return {
    checkId,
    checkName: checkId,
    run(): Promise<CheckResult> {
      return new Promise(() => {
        /* never resolves, to prove the timeout fires */
      });
    },
  };
}

function makeUnavailableChecker(checkId: string): DomainChecker {
  return {
    checkId,
    checkName: checkId,
    async run(): Promise<CheckResult> {
      return {
        checkId,
        checkName: checkId,
        status: "unavailable",
        summary: "not supported for this TLD",
        details: {},
        checkedAt: new Date().toISOString(),
      };
    },
  };
}

describe("createDomainHealthService", () => {
  it("returns healthy checks as-is", async () => {
    const service = createDomainHealthService([
      makeHealthyChecker("a"),
      makeHealthyChecker("b"),
    ]);
    const report = await service.checkDomain("example.com");

    expect(report.domain).toBe("example.com");
    expect(report.checks).toHaveLength(2);
    expect(report.checks.every((c) => c.status === "ok")).toBe(true);
  });

  it("maps a throwing checker to 'unknown' with an error, without affecting other checks", async () => {
    const service = createDomainHealthService([
      makeHealthyChecker("a"),
      makeThrowingChecker("b"),
    ]);
    const report = await service.checkDomain("example.com");

    const a = report.checks.find((c) => c.checkId === "a");
    const b = report.checks.find((c) => c.checkId === "b");
    expect(a?.status).toBe("ok");
    expect(b?.status).toBe("unknown");
    expect(b?.error).toBe("boom");
  });

  it("times out a hanging checker instead of hanging the whole report", async () => {
    const service = createDomainHealthService([makeHangingChecker("slow")], { timeoutMs: 20 });
    const report = await service.checkDomain("example.com");

    expect(report.checks[0]?.status).toBe("unknown");
    expect(report.checks[0]?.error).toMatch(/timed out/);
  });

  it("passes through an 'unavailable' result unchanged, not reinterpreting it as an error", async () => {
    const service = createDomainHealthService([makeUnavailableChecker("registration")]);
    const report = await service.checkDomain("example.se");

    expect(report.checks[0]?.status).toBe("unavailable");
    expect(report.checks[0]?.error).toBeUndefined();
  });
});
