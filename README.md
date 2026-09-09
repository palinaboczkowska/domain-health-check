# domain-health-check

Type in a domain, get an open-data sanity check before doing business with
that company: domain registration/expiry, TLS certificate health, DNS
presence, and basic HTTP security posture. **No API keys, ever.**

## Status

- [x] Session 1 — normalized model, all four pure interpretation functions
      (tested against real captured API responses), resilient orchestration
      service, all unit-tested fully offline
- [ ] Session 2 — real checkers (RDAP, TLS, DNS, HTTP), CLI, Express API, frontend
- [ ] Session 3 — docs, CI, GitHub push

## Quickstart

```bash
npm install
npm test   # fully offline, no network needed
```

## License

MIT — see [LICENSE](./LICENSE).
