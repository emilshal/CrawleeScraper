# Crawlee + Go Realtor.com Scraper

This project is a small monorepo that combines:

- A Go orchestration layer.
- A Crawlee (Node.js) crawler used to scrape data from Realtor.com.

The idea is that Go owns configuration, scheduling, and persistence, while Crawlee
handles all the heavy lifting around browser automation and crawling.

> Note: This is only the layout. The actual Realtor.com scraping logic and
> Go-to-Crawlee integration are left for the next steps.

## Layout

- `cmd/realtor-scraper/main.go` — Go entrypoint (CLI / service).
- `internal/app` — Application bootstrap and high-level orchestration.
- `internal/crawler` — Go-facing crawler interface; will call Crawlee.
- `crawler/` — Crawlee (Node.js + TypeScript) project.

## Go side

Module name in `go.mod`:

- `realtorcrawler`

Main entry:

- `go run ./cmd/realtor-scraper`

Right now this just logs startup and calls a stub in `internal/crawler`.
Later you can wire `internal/crawler.Run` to:

- Spawn the Node crawler via `os/exec` (e.g., `node crawler/dist/main.js`), or
- Talk to a long-running Crawlee service over HTTP or a message queue.

## Crawlee side

The Crawlee project lives in `crawler/`:

- `crawler/package.json` — Node project definition with Crawlee dependency.
- `crawler/tsconfig.json` — TypeScript config targeting modern Node.
- `crawler/src/main.ts` — Minimal `PlaywrightCrawler` stub hitting Realtor.com.

Recommended next steps:

1. Install Node dependencies (run inside `crawler/`):
   - `npm install`
2. Run the crawler in dev mode (still just a stub):
   - `npx ts-node-esm src/main.ts`
3. Add proper crawling logic:
   - Respect `robots.txt` and site terms of use.
   - Add request throttling, retries, and error handling.
   - Extract the exact Realtor.com data you need.

## Wiring Go and Crawlee

A simple integration approach:

1. Build the Crawlee project:
   - `cd crawler && npm run build`
2. In `internal/crawler`, replace the stub with code that:
   - Uses `os/exec` to run `node crawler/dist/main.js`.
   - Streams logs and handles the crawler's exit code.
3. Define an output contract:
   - For example, Crawlee writes JSON lines to stdout, which Go reads and
     persists to a database or file.

Once that’s in place, the Go binary (`realtor-scraper`) becomes your single
entrypoint for managing and running Realtor.com crawls, while Crawlee remains
fully focused on scraping behavior.

