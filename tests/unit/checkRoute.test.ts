import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { Express } from "express";
import { createApp } from "../../src/server/app.js";
import { createDomainHealthService } from "../../src/server/domainHealthService.js";
import type { CheckResult, DomainChecker } from "../../src/checks/types.js";

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

function listen(app: Express): Promise<{ baseUrl: string }> {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server!.address();
      const port = typeof address === "object" && address !== null ? address.port : 0;
      resolve({ baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

function makeChecker(checkId: string): DomainChecker {
  return {
    checkId,
    checkName: checkId,
    async run(): Promise<CheckResult> {
      return {
        checkId,
        checkName: checkId,
        status: "ok",
        summary: "test",
        details: {},
        checkedAt: new Date().toISOString(),
      };
    },
  };
}

describe("POST /api/check", () => {
  it("returns a report for a valid domain", async () => {
    const service = createDomainHealthService([makeChecker("a"), makeChecker("b")]);
    const app = createApp(service);
    const { baseUrl } = await listen(app);

    const response = await fetch(`${baseUrl}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: "example.com" }),
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as { domain: string; checks: CheckResult[] };
    expect(data.domain).toBe("example.com");
    expect(data.checks).toHaveLength(2);
  });

  it("returns 400 for an invalid domain", async () => {
    const service = createDomainHealthService([makeChecker("a")]);
    const app = createApp(service);
    const { baseUrl } = await listen(app);

    const response = await fetch(`${baseUrl}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: "not a domain" }),
    });

    expect(response.status).toBe(400);
  });

  it("serves the static frontend", async () => {
    const service = createDomainHealthService([makeChecker("a")]);
    const app = createApp(service);
    const { baseUrl } = await listen(app);

    const response = await fetch(`${baseUrl}/`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Domain Health Check");
  });
});
