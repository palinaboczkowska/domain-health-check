import { describe, expect, it } from "vitest";
import { interpretDns } from "../../src/checks/dnsInterpreter.js";

describe("interpretDns", () => {
  it("returns critical when no nameservers were found", () => {
    const result = interpretDns({ nsFound: false, a: null, aaaa: null, mx: null });
    expect(result.status).toBe("critical");
  });

  it("returns ok when nameservers and an A record are present", () => {
    const result = interpretDns({ nsFound: true, a: ["1.2.3.4"], aaaa: null, mx: null });
    expect(result.status).toBe("ok");
  });

  it("returns warning when nameservers exist but no A/AAAA record at the apex", () => {
    const result = interpretDns({ nsFound: true, a: null, aaaa: null, mx: null });
    expect(result.status).toBe("warning");
    expect(result.summary).toContain("www");
  });

  it("counts MX records without affecting status", () => {
    const result = interpretDns({
      nsFound: true,
      a: ["1.2.3.4"],
      aaaa: null,
      mx: [{ exchange: "mail.example.com", priority: 10 }],
    });
    expect(result.details.mxCount).toBe(1);
  });
});
