import { describe, expect, it } from "vitest";
import { parseDomain } from "../../src/validation/domainSchema.js";

describe("parseDomain", () => {
  it("accepts a normal domain", () => {
    expect(parseDomain("nike.com")).toBe("nike.com");
  });

  it("trims and lowercases", () => {
    expect(parseDomain("  Nike.COM  ")).toBe("nike.com");
  });

  it("unwraps a pasted full URL down to its hostname", () => {
    expect(parseDomain("https://nike.com/some/page?x=1")).toBe("nike.com");
  });

  it("accepts a multi-label TLD like .co.uk", () => {
    expect(parseDomain("example.co.uk")).toBe("example.co.uk");
  });

  it("rejects an empty string", () => {
    expect(() => parseDomain("")).toThrow();
  });

  it("rejects input with no dot at all", () => {
    expect(() => parseDomain("notadomain")).toThrow();
  });

  it("rejects input with spaces", () => {
    expect(() => parseDomain("not a domain.com")).toThrow();
  });
});
