import { describe, expect, it } from "vitest";
import { interpretHttpSecurity } from "../../src/checks/httpSecurityInterpreter.js";

describe("interpretHttpSecurity", () => {
  it("returns ok when HTTPS is reachable, redirects, and sends HSTS", () => {
    const result = interpretHttpSecurity({
      httpRedirectsToHttps: true,
      httpsReachable: true,
      hstsHeaderValue: "max-age=31536000",
    });
    expect(result.status).toBe("ok");
  });

  it("returns warning when it redirects but has no HSTS header", () => {
    const result = interpretHttpSecurity({
      httpRedirectsToHttps: true,
      httpsReachable: true,
      hstsHeaderValue: null,
    });
    expect(result.status).toBe("warning");
  });

  it("returns critical when HTTP does not redirect to HTTPS", () => {
    const result = interpretHttpSecurity({
      httpRedirectsToHttps: false,
      httpsReachable: true,
      hstsHeaderValue: null,
    });
    expect(result.status).toBe("critical");
  });

  it("returns critical when HTTPS is not reachable at all", () => {
    const result = interpretHttpSecurity({
      httpRedirectsToHttps: false,
      httpsReachable: false,
      hstsHeaderValue: null,
    });
    expect(result.status).toBe("critical");
    expect(result.summary).toContain("not reachable");
  });
});
