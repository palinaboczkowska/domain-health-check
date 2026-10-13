# Architecture

## Request flow

```mermaid
flowchart TD
    UI[Browser] -->|POST /api/check {domain}| API[Express route]
    API --> VAL[domainSchema: validate/normalize]
    VAL --> SVC[domainHealthService]
    SVC --> BATCH[Promise.allSettled over 4 checkers]
    BATCH --> REG[registrationChecker: IANA bootstrap + RDAP, WHOIS for .se/.nu]
    BATCH --> CERT[certificateChecker: tls.connect]
    BATCH --> DNS[dnsChecker: dns/promises]
    BATCH --> HTTP[httpSecurityChecker: fetch]
    REG --> RESULT[CheckResult x4]
    CERT --> RESULT
    DNS --> RESULT
    HTTP --> RESULT
    RESULT --> SVC
    SVC --> API
    API --> UI
```

## Four independent checks, one shared resilience layer

Each checker has a pure "interpreter" (raw data + current time in, a
`CheckResult`'s status/summary/details out — zero network, fully unit
testable) and a thin "checker" that does the one real I/O call and hands the
result to its interpreter. This mirrors the pure/impure split already used in
the sibling projects (`statuspageParser.ts`/`statuspageAdapter.ts`,
`evidence.ts`/`anthropicSearchClient.ts`).

- **Registration** (`registrationInterpreter.ts` / `registrationChecker.ts`):
  looks up the domain's TLD in IANA's official RDAP bootstrap file (cached
  24h) before attempting anything. Verified live that `.se` and `.io` are
  both genuinely absent from that file. For `.se` and `.nu` it falls back to
  the registry's own WHOIS server and reads the `expires:` line; other
  unlisted TLDs return "unavailable" — see
  [`docs/graceful-degradation-design.md`](./graceful-degradation-design.md).
- **TLS Certificate** (`certificateInterpreter.ts` / `certificateChecker.ts`):
  a raw `tls.connect` with `rejectUnauthorized: false` — the only way to
  inspect an expired or otherwise-untrusted certificate's metadata at all,
  since Node aborts the handshake before that point with the default setting.
- **DNS** (`dnsInterpreter.ts` / `dnsChecker.ts`): `dns/promises`, resolving
  NS/A/AAAA/MX independently. NS presence is used as the "does this domain
  exist at all" signal, because Node's DNS module can't otherwise distinguish
  "domain doesn't exist" from "domain exists but has no records of this
  type" — both surface as the same error code.
- **HTTP Security** (`httpSecurityInterpreter.ts` / `httpSecurityChecker.ts`):
  a `fetch` with `redirect: "manual"` against the HTTP URL (to inspect the
  3xx response ourselves) plus a normal HTTPS fetch checking for an HSTS
  header. Only the bare apex domain is checked, not `www.<domain>` — a real,
  documented coverage gap.

## Resilience

`domainHealthService.ts` is a direct port of the sibling
`vendor-status-dashboard`'s `statusService.ts` pattern: `Promise.allSettled`
over all four checkers, a per-checker timeout, and a try/catch that never
rethrows — any unexpected failure becomes `{status: "unknown", error: "..."}`
for that check only. The one addition here: a checker can also return
`"unavailable"` directly, as a normal (non-throwing) result — the
orchestrator passes it through completely unchanged, since it isn't a
failure at all. See
[`docs/graceful-degradation-design.md`](./graceful-degradation-design.md) for
why this distinction exists and what it prevents.

Unlike `vendor-status-dashboard`, there's no whole-response cache here — the
input is an arbitrary user-supplied domain rather than a fixed vendor list,
so a fixed-TTL cache keyed on nothing wouldn't make sense. A per-domain cache
is a reasonable future enhancement, deliberately left out of v1.

## No API keys, anywhere

Three of the four checks (certificate, DNS, HTTP security) use nothing but
Node's own built-in `tls`, `dns`, and `fetch` — no external service at all.
The fourth (registration) uses one free, public file from IANA. There is
nothing to put in `.env` except optional tuning knobs.
