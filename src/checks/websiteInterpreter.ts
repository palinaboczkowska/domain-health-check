import type { CheckResult } from "./types.js";

export interface WebsiteSummary {
  title: string | null;
  siteName: string | null;
  description: string | null;
  language: string | null;
}

const MAX_DESCRIPTION_LENGTH = 220;

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function clean(text: string | undefined): string | null {
  if (!text) return null;
  const value = decodeEntities(text).replace(/\s+/g, " ").trim();
  return value.length > 0 ? value : null;
}

/** Reads every attribute of one tag, whatever order the site writes them in. */
function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    const name = match[1];
    if (name) result[name.toLowerCase()] = match[2] ?? match[3] ?? "";
  }
  return result;
}

/**
 * Pure extraction of what a site says about itself: <title>, the meta
 * description, og:site_name and <html lang>. Only reads tags the site
 * publishes; nothing is summarized or generated.
 */
export function extractWebsiteSummary(html: string): WebsiteSummary {
  const meta: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    const key = (attrs.name ?? attrs.property)?.toLowerCase();
    if (key && attrs.content !== undefined && !(key in meta)) meta[key] = attrs.content;
  }

  const htmlTag = /<html\b[^>]*>/i.exec(html)?.[0];
  const titleText = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];

  let description = clean(meta.description ?? meta["og:description"]);
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    description = `${description.slice(0, MAX_DESCRIPTION_LENGTH).trimEnd()}…`;
  }

  return {
    title: clean(titleText ?? meta["og:title"]),
    siteName: clean(meta["og:site_name"]),
    description,
    language: clean(htmlTag ? attributes(htmlTag).lang : undefined),
  };
}

export function interpretWebsiteSummary(
  summary: WebsiteSummary,
): Omit<CheckResult, "checkId" | "checkName" | "checkedAt"> {
  const name = summary.siteName ?? summary.title;
  if (!name && !summary.description) {
    return {
      status: "unavailable",
      summary: "The website doesn't publish a title or description",
      details: { language: summary.language },
    };
  }
  return {
    status: "ok",
    summary: summary.description ?? name ?? "",
    details: {
      title: summary.title,
      siteName: summary.siteName,
      description: summary.description,
      language: summary.language,
    },
  };
}
