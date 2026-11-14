# Decisions

Choices made without stopping to ask. Newest last.

1. **Stack as suggested.** Next.js 15 (App Router) + TypeScript + Tailwind 4. Scripts run with `tsx`.
2. **Cache is committed.** `data/cache/cala/*.json` holds raw Cala responses keyed by a hash of (method, path, body). Headers (and so the API key) are never part of the key or the record. Committing it means the booth demo and re-ingests work offline and nothing is queried twice, even across machines.
3. **Node fetch behind a proxy.** In the cloud sandbox Node's built-in fetch needs `NODE_USE_ENV_PROXY=1`. Documented in `.env.example`; no proxy code in the app.
