# Why ".se" showing "unavailable" is a feature, not a bug

## The finding

Before writing any code, the actual coverage of RDAP (the open, keyless
replacement for WHOIS) was checked against IANA's own official bootstrap
registry (`https://data.iana.org/rdap/dns.json`, 590 entries, fetched live):

- `.com`, `.net`, and hundreds of other TLDs are listed, each with a real
  RDAP base URL (e.g. `https://rdap.verisign.com/com/v1/` for `.com`).
- **`.se` — Sweden's own ccTLD — is not listed at all.** Sweden's registry
  doesn't participate in the IANA RDAP bootstrap.
- **`.io` is also not listed**, even though a direct guess at an unofficial
  endpoint (`rdap.identitydigital.services`) happened to respond during
  testing. That endpoint is deliberately **not** hardcoded here — if it
  isn't in IANA's own registry, it isn't treated as reliable, on principle,
  not just for `.io` specifically.

This is a real, structural limitation of the open RDAP ecosystem, not an edge
case invented for this project. A tool built by a Swedish developer, for
checking real companies, would be dishonest if it silently pretended this
gap didn't exist.

## The design response

`registrationChecker.ts` looks up the TLD in the bootstrap file **before**
attempting any RDAP call. If the TLD isn't listed, it returns a `CheckResult`
with `status: "unavailable"` directly — no network call to a guessed
endpoint, no exception, no `.error` field. This is a genuinely different
situation from `"unknown"` (an actual failure — timeout, network error, a
listed registry being down), and the two are kept structurally distinct all
the way to the UI:

| | Meaning | Has `.error`? | UI treatment |
|---|---|---|---|
| `unavailable` | This check doesn't apply / isn't supported here | No | Neutral gray — "not available for this TLD" |
| `unknown` | Something unexpected went wrong while checking | Yes | Distinct color — genuinely "we don't know" |

If `.se` were mapped to `"critical"` or silently reused the `"unknown"`
bucket, a Swedish user checking a `.se` domain would see what looks like an
alarming failure on every single domain they check — never once telling them
the real reason (there's simply no public data source for this), and
training them to distrust or ignore the tool. The whole point of
`unavailable` as a distinct status is to make that specific dishonest failure
mode impossible to accidentally produce.

## The rule for adding coverage later

If Sweden's registry (or any other currently-unlisted TLD) ever adds RDAP
support and gets included in IANA's bootstrap file, this project picks it up
automatically — `registrationChecker.ts` doesn't hardcode a TLD allowlist, it
reads the real file. Nothing needs to change in this codebase for that case.
The only thing that should never happen is hardcoding an unofficial endpoint
(like the `.io` one found during testing) just because it happened to work
once — that trades a small, honest, well-understood gap for a fragile,
undocumented dependency.
