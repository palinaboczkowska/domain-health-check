import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  IanaBootstrapSchema,
  findRdapBaseUrl,
  interpretRdapResponse,
  unavailableRegistrationResult,
} from "../../src/checks/registrationInterpreter.js";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

async function loadFixture(name: string): Promise<unknown> {
  const raw = await readFile(path.join(fixturesDir, name), "utf8");
  return JSON.parse(raw);
}

describe("findRdapBaseUrl", () => {
  it("finds the real Verisign base URL for .com in a real IANA bootstrap snippet", async () => {
    const raw = await loadFixture("iana-rdap-bootstrap-snippet.json");
    const bootstrap = IanaBootstrapSchema.parse(raw);

    expect(findRdapBaseUrl(bootstrap, "com")).toBe("https://rdap.verisign.com/com/v1/");
  });

  it("returns undefined for .se, confirmed absent from the real IANA bootstrap file", async () => {
    const raw = await loadFixture("iana-rdap-bootstrap-snippet.json");
    const bootstrap = IanaBootstrapSchema.parse(raw);

    expect(findRdapBaseUrl(bootstrap, "se")).toBeUndefined();
  });

  it("returns undefined for .io, also confirmed absent from the official bootstrap", async () => {
    const raw = await loadFixture("iana-rdap-bootstrap-snippet.json");
    const bootstrap = IanaBootstrapSchema.parse(raw);

    expect(findRdapBaseUrl(bootstrap, "io")).toBeUndefined();
  });

  it("matches case-insensitively", async () => {
    const raw = await loadFixture("iana-rdap-bootstrap-snippet.json");
    const bootstrap = IanaBootstrapSchema.parse(raw);

    expect(findRdapBaseUrl(bootstrap, "COM")).toBe("https://rdap.verisign.com/com/v1/");
  });
});

describe("interpretRdapResponse", () => {
  it("parses a real RDAP response (captured live for nike.com) as ok, far from expiry", async () => {
    const raw = await loadFixture("rdap-nike-com-response.json");
    const now = new Date("2026-09-09T00:00:00.000Z");

    const result = interpretRdapResponse(raw, now);

    expect(result.status).toBe("ok");
    expect(result.details.expiresAt).toBe("2028-03-05T05:00:00Z");
    expect(typeof result.details.daysRemaining).toBe("number");
    expect(result.details.daysRemaining as number).toBeGreaterThan(30);
  });

  it("returns warning when expiry is within the warning window", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const raw = { events: [{ eventAction: "expiration", eventDate: "2026-01-15T00:00:00.000Z" }] };

    expect(interpretRdapResponse(raw, now).status).toBe("warning");
  });

  it("returns critical when already expired", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const raw = { events: [{ eventAction: "expiration", eventDate: "2025-12-01T00:00:00.000Z" }] };

    const result = interpretRdapResponse(raw, now);
    expect(result.status).toBe("critical");
    expect(result.summary).toContain("expired");
  });

  it("returns 'unknown' when no expiration event is present", () => {
    const result = interpretRdapResponse({ events: [] }, new Date());
    expect(result.status).toBe("unknown");
    expect(result.error).toBeDefined();
  });
});

describe("unavailableRegistrationResult", () => {
  it("is a structural non-error, distinct from 'unknown'", () => {
    const result = unavailableRegistrationResult("se");
    expect(result.status).toBe("unavailable");
    expect(result.error).toBeUndefined();
    expect(result.summary).toContain(".se");
  });
});
