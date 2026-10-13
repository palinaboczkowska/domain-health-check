# domain-health-check

Type in a domain, get an open-data sanity check before doing business with
that company: domain registration/expiry, TLS certificate health, DNS
presence, basic HTTP security posture, and a short summary of the website
itself (its own title, description and language). **No API keys, ever.**

## Why this exists

I built it for myself. My former freelance web clients still write to ask
when their domain needs renewing and paying for next year. Instead of
logging in at the registrar and looking up credentials, I run this locally,
type the domain and see the expiry date, the registrar, the certificate and
the site's own description in one view.

More generally, checking whether a domain is about to expire, whether its certificate is
healthy, or whether it even resolves is a real, quick due-diligence step
before trusting a company you haven't worked with before. This tool
automates that check using nothing but open data and protocol-level checks —
no signup, no key, no cost.

## How it works

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
    REG & CERT & DNS & HTTP --> RESULT[CheckResult x4]
    RESULT --> SVC --> API --> UI
```

Full write-up: [`docs/architecture.md`](./docs/architecture.md) ·
[`docs/graceful-degradation-design.md`](./docs/graceful-degradation-design.md)

## The honest limitation, front and center

**Domain registration data isn't available for every TLD.** Sweden's own
`.se` isn't in IANA's official RDAP registry — checked live before writing
any code, not assumed. For `.se` and `.nu` the tool falls back to the Swedish
Internet Foundation's own WHOIS server (port 43) and reads the `expires:`
line. For other unlisted TLDs, like `.io`, it doesn't guess at an unofficial
endpoint: the registration card shows a plain, neutral "unavailable", while
the other three checks (certificate, DNS, HTTP security) still work. See
[`docs/graceful-degradation-design.md`](./docs/graceful-degradation-design.md)
for the full reasoning.

## Status

- [x] Session 1 — normalized model, four pure interpreters (tested against
      real captured API responses), resilient orchestration service
- [x] Session 2 — real checkers, CLI, Express API, frontend. Verified live
      end to end, including the `.se` graceful-degradation case
- [x] Session 3 — docs, CI (including a daily live check against real domains),
      and this GitHub repo

## Quickstart

Genuinely free, always:

```bash
npm install
npm test                 # 40 tests, fully offline, no network needed
npm run cli -- nike.com    # real, live checks printed to the terminal
npm run cli -- <a .se domain>   # registration via the .se WHOIS fallback
npm run cli -- <a .io domain>   # see the graceful "unavailable" case live
npm run dev                # starts the real dashboard on :3000
```

## Development

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

CI (`.github/workflows/ci.yml`) runs a deterministic `lint-typecheck-test` job
on every push/PR, plus a `live-check` job against real domains (one `.com`,
one `.se` via WHOIS, one `.io`) — genuinely free, so it runs on every push, daily on schedule, and
on manual dispatch. Unlike a job that depends on one vendor's uptime, this
one depends on general internet infrastructure (DNS, TLS, IANA's bootstrap
file), so it's safe to run often.

## Known limitations

- Domain registration data is only available for TLDs listed in IANA's
  official RDAP bootstrap, plus `.se` and `.nu` via WHOIS. Others, like
  `.io`, show "unavailable". See
  [`docs/graceful-degradation-design.md`](./docs/graceful-degradation-design.md).
- HTTP security and certificate checks only look at the bare apex domain, not
  `www.<domain>` — a site serving HTTPS only on `www` will show as
  unreachable at the apex.
- Node's DNS module can't distinguish "domain doesn't exist" from "domain
  exists but has no records of this type" — NS resolution is used as the
  "does this domain exist" signal to work around that ambiguity.
- `npm audit` reports a few transitive advisories from `vitest`'s dev
  toolchain (`vite`, `esbuild`) — dev-only, not shipped, not reachable here.

## License

MIT — see [LICENSE](./LICENSE).
