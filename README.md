# domain-health-check

Type in a domain, get an open-data sanity check before doing business with
that company: domain registration/expiry, TLS certificate health, DNS
presence, and basic HTTP security posture. **No API keys, ever.**

## Status

- [x] Session 1 — normalized model, all four pure interpretation functions
      (tested against real captured API responses), resilient orchestration
      service, all unit-tested fully offline
- [x] Session 2 — real checkers (RDAP, TLS, DNS, HTTP), CLI, Express API,
      frontend. **Verified live end to end**, including the graceful-
      degradation case: a real `.se` domain correctly shows "unavailable" for
      registration (not an error) while the other three checks return real data
- [ ] Session 3 — docs, CI, GitHub push

## Quickstart

Genuinely free, always:

```bash
npm install
npm test               # 36 tests, fully offline, no network needed
npm run cli -- nike.com   # real, live checks printed to the terminal
npm run dev              # starts the real dashboard on :3000
```

## License

MIT — see [LICENSE](./LICENSE).
