import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractWebsiteSummary,
  interpretWebsiteSummary,
} from "../../src/checks/websiteInterpreter.js";

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures",
);

async function loadHtml(name: string): Promise<string> {
  return readFile(path.join(fixturesDir, name), "utf8");
}

describe("extractWebsiteSummary", () => {
  it("reads title, site name, description and language from a real Swedish site", async () => {
    const summary = extractWebsiteSummary(await loadHtml("website-svt-se.html"));

    expect(summary.siteName).toBe("SVT Nyheter");
    expect(summary.language).toBe("sv");
    expect(summary.description).toMatch(/^SVT Nyheter med senaste nytt/);
  });

  it("handles meta tags with content before name and decodes entities", async () => {
    const summary = extractWebsiteSummary(await loadHtml("website-precis-com.html"));

    expect(summary.title).toBe("Precis | Marketing that connects the dots");
    expect(summary.language).toBe("en");
    expect(summary.description).toContain("brand's");
  });

  it("shortens very long descriptions", () => {
    const long = "word ".repeat(100);
    const summary = extractWebsiteSummary(`<meta name="description" content="${long}">`);

    expect(summary.description?.length).toBeLessThanOrEqual(221);
    expect(summary.description?.endsWith("…")).toBe(true);
  });
});

describe("interpretWebsiteSummary", () => {
  it("is unavailable, not an error, when the site publishes nothing", () => {
    const result = interpretWebsiteSummary(
      extractWebsiteSummary("<html><body>hi</body></html>"),
    );

    expect(result.status).toBe("unavailable");
    expect(result.error).toBeUndefined();
  });
});
