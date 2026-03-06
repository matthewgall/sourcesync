# SourceSync Worker

Cloudflare Worker that periodically downloads data sources, stores them in R2, and exposes a small API for refresh/status.

## Setup

1. Create an R2 bucket named `sourcesync` (or update `wrangler.toml`).
2. Install deps: `npm install`
3. (Optional) Add an API key:
   - `wrangler secret put API_KEY`

## Deploy

```
npm run deploy
```

## Endpoints

- `GET /` basic service info
- `GET /status` last refresh results
- `GET /data?url=...` fetch stored object by source URL
- `GET /data?key=...` fetch stored object by key
- `POST /refresh` refresh all sources (requires `x-api-key` if set)
- `POST /refresh` with body `{ "source": "iana.ipv4" }` to refresh a single source
- `POST /refresh` with body `{ "url": "https://example.com/file", "key": "custom/path" }`

## Stored keys

- Sources are stored under `sources/<source>/<filename>`
- State JSON stored at `sources/state.json`

## Notes

- The scheduled trigger runs every 6 hours (see `wrangler.toml`).
- If the upstream responds with `ETag` or `Last-Modified`, the worker uses conditional requests.
