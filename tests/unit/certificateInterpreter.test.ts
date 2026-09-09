import { describe, expect, it } from "vitest";
import {
  interpretCertificate,
  unreachableCertificateResult,
} from "../../src/checks/certificateInterpreter.js";
import type { RawCertificateInfo } from "../../src/checks/certificateInterpreter.js";

const now = new Date("2026-01-01T00:00:00.000Z");

function makeCert(overrides: Partial<RawCertificateInfo> = {}): RawCertificateInfo {
  return {
    validFrom: "2025-01-01T00:00:00.000Z",
    validTo: "2027-01-01T00:00:00.000Z",
    issuer: { O: "Example CA" },
    subject: { CN: "example.com" },
    authorized: true,
    authorizationError: null,
    ...overrides,
  };
}

describe("interpretCertificate", () => {
  it("returns ok when far from expiry and trusted", () => {
    const result = interpretCertificate(makeCert(), now);
    expect(result.status).toBe("ok");
  });

  it("returns warning when expiring within the warning window", () => {
    const result = interpretCertificate(makeCert({ validTo: "2026-01-15T00:00:00.000Z" }), now);
    expect(result.status).toBe("warning");
  });

  it("returns critical when already expired", () => {
    const result = interpretCertificate(makeCert({ validTo: "2025-12-01T00:00:00.000Z" }), now);
    expect(result.status).toBe("critical");
    expect(result.summary).toContain("expired");
  });

  it("returns warning when untrusted for a non-expiry reason", () => {
    const result = interpretCertificate(
      makeCert({ authorized: false, authorizationError: "SELF_SIGNED_CERT" }),
      now,
    );
    expect(result.status).toBe("warning");
    expect(result.summary).toContain("SELF_SIGNED_CERT");
  });
});

describe("unreachableCertificateResult", () => {
  it("is critical with the reason in details", () => {
    const result = unreachableCertificateResult("ECONNREFUSED");
    expect(result.status).toBe("critical");
    expect(result.details.reason).toBe("ECONNREFUSED");
  });
});
