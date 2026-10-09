# Order Explorer

A searchable, filterable, sortable explorer over **12,000 orders** that stays fast and never
shows the wrong results, even though the API behind it is deliberately slow (200 ms–3 s) and
fails about 1 request in 10.

Built for **Problem Statement 1** of the Frontend Developer Assignment: _"Can you build a data
explorer that stays fast and never shows the wrong results?"_

| | |
| --- | --- |
| **Live demo** | `TODO: add the Vercel live URL` |
| **Demo video** | `TODO: add the demo video link` |
| **AI conversation** | `TODO: add the Claude conversation share link` |

> **Placeholders:** every `TODO` in this file marks a URL that will be filled in once it
> exists: the three above, the same ones repeated under [Deployment](#deployment) and
> [AI usage disclosure](#ai-usage-disclosure), and the GitHub repository URL under
> [Getting started](#getting-started).

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts: build, test and quality](#scripts-build-test-and-quality)
- [Deployment](#deployment)
- [How each requirement is met](#how-each-requirement-is-met)
- [Architecture](#architecture)
- [Tradeoffs](#tradeoffs)
- [Known limitations](#known-limitations)
- [Tests](#tests)
- [Sources and references](#sources-and-references)
- [AI usage disclosure](#ai-usage-disclosure)

---

## Features

**Exploring the data**

- **12,000 orders** with ID, date, customer, email, status, country, payment method, item
  count, total, line items and shipping address.
- **Search** by order ID, customer name or email. The search ignores case and accents
  ("muller" finds "Müller"), and every word must match.
- **Filters:** status, payment method, country (multi-select), order total range and order
  date range. Active filters appear as removable chips, with a "Clear all" button.
- **Sorting** by order ID, date, customer, status, country, item count or total, ascending
  or descending.
- **Pagination** with 25 / 50 / 100 / 250 / 500 / 1,000 rows per page.
- **Summary panel** for the current filters: matching orders, revenue, average order value
  and a breakdown by status.
- **Order detail drawer** with customer, shipping address and line items. It can be opened
  by URL (deep link).

**Behaviour under real-world conditions**

- Search is debounced; superseded requests are cancelled, and their responses can never
  replace newer results.
- The whole view lives in the URL: search, filters, sort, page, page size and the open
  order. Refresh, Back/Forward and shared links restore it exactly. Scroll position is
  restored within the browser tab.
- Distinct states for loading, refreshing, empty results, errors (with Retry), partial
  failure (the summary fails while the list works) and out-of-range pages.
- Virtualized table: smooth scrolling through 1,000-row pages.
- Fully usable with the keyboard alone and with screen readers.
- **Network simulation** control in the app header: change the API's response time and
  failure rate without DevTools.

---

## Tech stack

| Area | Choice |
| --- | --- |
| Language | TypeScript 6 (strict) |
| UI | React 19 |
| Build tool | Vite 8 |
| Routing and URL state | React Router 8 (`useSearchParams`, nested route for the drawer) |
| Server state and caching | TanStack Query 5 |
| Virtualization | TanStack Virtual 3 |
| URL / API query schema | Zod 4 |
| Styling | Tailwind CSS 4 |
| Mock API | MSW 2 (Mock Service Worker), running in the browser in every environment |
| Unit and integration tests | Vitest 5, Testing Library, jsdom, MSW (Node) |
| End-to-end tests | Playwright (Chromium), @axe-core/playwright |
| Code quality | ESLint 10 (typescript-eslint, react-hooks), Prettier |
| Hosting | Vercel (static build) |

---

## Getting started

### Prerequisites

- **Node.js 22.22 or newer** (required by React Router 8; declared in `package.json` `engines`)
- npm (comes with Node)

### Install and run

```bash
git clone TODO-add-the-GitHub-repository-URL
cd order-explorer      # or whatever folder you cloned into
npm install
npm run dev
```

Open the URL Vite prints (by default http://localhost:5173).

No backend, database or API key is needed. The mock API starts inside the page as a service
worker (`public/mockServiceWorker.js`).

### Simulating bad networks

Click **Network simulation** in the top-right corner of the app:

- **Response time:** Instant, 0.2–3 s (default) or Slow 2.5–4 s
- **Requests that fail:** Never, 1 in 10 (default), Half or Always

The choice is saved in `localStorage` and applies immediately. DevTools network throttling
and "Offline" also work, on top of the simulated latency.

---

## Environment variables

**None are required.** The app has no backend, secrets or API keys, and runs with zero
configuration both locally and on Vercel.

| Variable | Used by | Effect |
| --- | --- | --- |
| `CI` | `playwright.config.ts` only | When set (any value): retries each failed browser test once, fails if a `test.only` was left in, uses the GitHub reporter, and always starts a fresh server instead of reusing one. Leave it unset locally. |

Vite's built-in `import.meta.env.PROD` is used to silence MSW's console messages in production
builds. It is set automatically and needs no configuration.

---

## Scripts: build, test and quality

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server with the mock API |
| `npm run build` | Type-check, then build for production into `dist/` |
| `npm run preview` | Serve the production build locally (http://localhost:4173) |
| `npm test` | Run unit and integration tests once (Vitest) |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run e2e` | Build, serve and run the Playwright browser tests |
| `npm run typecheck` | TypeScript type check only |
| `npm run lint` | ESLint |
| `npm run check` | Type check + lint + unit tests in one go |

Before the first `npm run e2e`, install Playwright's browser once:

```bash
npx playwright install chromium
```

To run a single test file: `npx vitest run src/features/explorer` or
`npx playwright test e2e/explorer.spec.ts`.

---

## Deployment

**Live URL:** `TODO: add the Vercel live URL`

The app is a static site. `vercel.json` contains everything Vercel needs:

- Build command `npm run build`, output directory `dist`
- A rewrite to `index.html`, so deep links such as `/orders/ORD-100042?status=shipped` work
  after a refresh. Real files such as `/mockServiceWorker.js` and `/assets/*` are served
  before the rewrite applies.
- `Cache-Control: no-cache` for `mockServiceWorker.js`, so browsers always pick up the
  current worker.

To deploy, import the GitHub repository in Vercel and keep the defaults. No environment
variables are needed.

---

## How each requirement is met

| Requirement | Implementation | Verified by |
| --- | --- | --- |
| **≥ 10,000 records; server-side search, filtering, sorting, pagination** | 12,000 orders from a seeded generator (identical on every load). The MSW handler filters, sorts and paginates. The UI only ever receives one page. | `mocks/query.test.ts`; `e2e/dataset.spec.ts` fetches all 480 pages of 25 through the real service worker: 12,000 unique IDs, no gaps, no repeats |
| **Random latency 200 ms–3 s; ~1 in 10 requests fail** | `mocks/chaos.ts`: each request waits a random delay; 10 % return a 500 or 503 JSON error | `mocks/handlers.test.ts` (latency range; 300 requests with failure rate in range) |
| **Never show stale results** | Search debounced by 300 ms. Each distinct query has its own cache key, so a response can only be stored under the query that requested it. Superseded requests are cancelled with `AbortSignal`. | `ExplorerPage.test.tsx`: a slow "olivia" response arriving after the fast "olivia smith" one is never shown, and the slow request is aborted. Typing "tanaka" sends exactly one request. |
| **State in the URL** | Search, filters, sort, page and page size live only in the query string; the open order is in the path. Every change is a history entry. Invalid links are repaired in place. | Unit tests for parsing and serialisation; component tests for Back/Forward; Playwright: refresh restores the exact view including scroll position, and real browser Back/Forward work |
| **Stay fast with large lists** | TanStack Virtual renders only visible rows (plus a small buffer). Rows are memoised, callbacks stable, formatters created once. | Test: a 1,000-row page renders fewer than 40 DOM rows. Measured in Chromium: steady 60 fps scrolling all 1,000 rows (p95 frame time 16.7 ms, at most 29 rows in the DOM) |
| **Distinct loading, empty, error and partial-failure states** | Skeleton on first load. While a new query loads, old rows stay visible but **dimmed, `inert` and `aria-busy`**, with "Updating results…". On failure, old rows are **removed** and the server's message is shown with **Retry**. Empty results offer "Clear search and filters". The summary is a separate request: if only it fails, it says so with its own Retry and the list keeps working. Pages past the end get their own message. | `ExplorerPage.test.tsx` (error + retry, partial failure, empty, out of range); Playwright forces failures through the in-app simulator |
| **Accessible** | ARIA grid with a single Tab stop and ↑ ↓ / Home / End / Page Up / Page Down; Enter or Space opens a row. `aria-sort` on sortable headers, `aria-current` in pagination, native checkboxes in fieldsets, labelled inputs, a visible focus ring, "Skip to results" link. Result counts are announced via a polite live region and errors via `role="alert"`. `prefers-reduced-motion` is respected. | Keyboard test in jsdom; Playwright keyboard-only flow (Tab to the grid → arrows → Enter → Esc, focus returns to the row); axe-core scan: **0 WCAG 2.1 AA violations** on the list and on the drawer |
| **Detail view: deep-linkable, closes without losing scroll or filters** | Route `/orders/:id` keeps the list's query string and renders a drawer over the list, which stays mounted. Native `<dialog>` + `showModal()` makes the page behind it inert and handles Esc. Closing returns focus to the opening row. A 404 shows "Order not found". | `OrderDrawer.test.tsx`; Playwright: scroll position identical after open/close, deep link survives refresh |

---

## Architecture

```
src/
  main.tsx              Starts the mock API (service worker), then renders the app
  App.tsx               Routes, error boundary, not-found page
  queryClient.ts        TanStack Query defaults (retry policy, stale time, ApiError typing)
  shared/               Code used by both the client and the mock server
    order.ts            Domain types: Order, OrderSummary, OrderPage, OrderStats
    orderQuery.ts       Zod schema: URL ⇄ OrderQuery (lenient parse, canonical serialise)
  mocks/                The mock backend
    data.ts             Seeded generator for 12,000 orders
    query.ts            Pure filter / search / sort / paginate / stats logic
    chaos.ts            Latency and failure simulation (configurable at runtime)
    handlers.ts         MSW routes: GET /api/orders, /api/orders/stats, /api/orders/:id
    browser.ts, server.ts   MSW setup for the browser and for Node (tests)
  api/
    client.ts           fetch wrapper: typed ApiError, abort-aware
    orders.ts           Query keys and TanStack Query hooks
  features/
    explorer/           Page, URL-state hook, search, filters, grid, pagination, summary
    detail/             Order drawer (nested route)
    simulation/         Network-simulation control
  components/           Shared UI: status badge, error/empty states, spinner, styles
  hooks/
    useDebouncedDraft.ts   Debounced input that stays in sync with the URL
  lib/format.ts         Money, date and label formatting
  test/                 Test setup and the renderApp helper
e2e/                    Playwright tests
```

### API

| Endpoint | Returns |
| --- | --- |
| `GET /api/orders?q=&status=&country=&payment=&minTotal=&maxTotal=&from=&to=&sort=&dir=&page=&pageSize=` | `{ items, total, page, pageSize, pageCount }` |
| `GET /api/orders/stats?…same filters…` | `{ count, revenueCents, averageCents, byStatus }` |
| `GET /api/orders/:id` | Full order, or 404 `{ message }` |

Multi-value filters are comma-separated (`status=shipped,delivered`). Amounts are in whole
dollars; dates are `YYYY-MM-DD` in UTC, and both ends of a date range are inclusive.

### State management: three places, each with one job

1. **The URL holds the view state.** `useOrderQueryParams` parses the query string with the
   Zod schema and writes changes back. No copy of the filters lives in React state or a
   global store, so nothing can drift out of sync, and refresh, Back/Forward and shared links
   restore the view by construction. Parsing is lenient per field (`page=-4` becomes page 1;
   unknown statuses are dropped), so a hand-edited link never breaks the page. The URL is then
   rewritten to its canonical form.
2. **TanStack Query holds the server state.** The query key contains the canonical query
   string. This gives caching (Back is instant), request cancellation and the stale-response
   guarantee, because a response is only ever stored under the key of the request that
   produced it. The summary is a separate query keyed only by the filters, so changing page
   or sort doesn't refetch it.
3. **Local component state is only for in-progress input.** The search box and amount fields
   keep a draft while the user types (`useDebouncedDraft`). The draft follows the URL when it
   changes from outside (Back, "Clear all") but ignores the echo of its own commit, so a
   debounced update can't overwrite keystrokes typed in the meantime.

### Why the mock API runs in a service worker

The deployed app must use a mock API that has latency and failures. MSW intercepts `fetch` at
the network level, so the application code is exactly what it would be against a real
backend: real `fetch`, real `AbortSignal`, real HTTP status codes. The same handlers serve the
browser (development and production), Vitest (Node) and Playwright. The mock code is loaded
with a dynamic `import()`, so it is bundled separately from the application code.

---

## Tradeoffs

- **Numbered pages + virtualization, not infinite scroll.** A page number restores exactly
  from the URL and is meaningful in a shared link. Infinite scroll would need the loaded
  range and offset in the URL, and restoring it means refetching many pages. Users who want
  many rows can choose 1,000 per page, which is virtualized.
- **Old rows stay visible, but marked, while a new query loads.** Hiding the table on every
  search makes the page flash. Old rows are dimmed, `inert` and `aria-busy`, and the status
  line says "Updating results…", so they can't be mistaken for, or acted on as, the new
  results. If the request fails, they are removed.
- **One automatic retry.** Transient errors (5xx, network) are retried once after 400 ms;
  404s are not. This is realistic for production, but it means fewer than 10 % of requests
  visibly fail. The simulator's "Half" or "Always" settings show the error states on demand.
  Automated tests disable the retry.
- **Every change is a history entry.** Filters, sort, page and debounced search terms are
  pushed, so Back undoes them one step at a time. The debounce prevents an entry per
  keystroke.
- **Native `<dialog>` for the drawer** instead of a hand-written focus trap. The browser
  provides the inert background and Esc handling. As specified for modal dialogs, Tab can
  reach the browser's own UI after the last control, but never the page behind the drawer
  (checked by a Playwright test).
- **Scroll position in `sessionStorage`, not the URL.** A pixel offset depends on the device
  and isn't meaningful in a shared link. It's restored within the tab across refresh and
  Back/Forward.
- **A small seeded generator instead of Faker.** Faker's locale data would add several MB to
  the production mock chunk. About 100 lines of seeded generation is enough, and it's
  deterministic.

---

## Known limitations

- **The backend is a mock that runs in the browser.** Data is generated client-side and is
  read-only; there is no persistence or authentication. Filtering 12,000 records runs on the
  page's main thread (a few milliseconds per request). A real server would do this off the
  client.
- **Service workers are required.** The app needs a secure context (HTTPS or `localhost`) and
  a browser that allows service workers. Where they are blocked (some private-browsing modes
  or locked-down enterprise policies), the API is unavailable and the app shows its error
  state.
- **The mock API loads before the first render**, which adds a ~160 kB (gzipped) download to
  the first visit. A real backend wouldn't have this cost.
- **Mobile table layout.** On narrow screens the table scrolls horizontally instead of turning
  into cards. It is usable but not optimised for phones.
- **Long text is truncated** to keep a fixed row height (needed for virtualization). The full
  values are in the detail drawer.
- **Search is substring-based** over ID, name and email. There is no fuzzy matching or
  relevance ranking.
- **USD only; dates shown and filtered in UTC.**
- **Scroll position isn't part of shared links** (see [Tradeoffs](#tradeoffs)); a shared link
  opens at the top of the restored page.
- **Browser coverage of automated tests:** Playwright runs on Chromium only. Accessibility was
  checked with axe-core and keyboard-only testing. A full manual screen-reader pass (NVDA,
  VoiceOver) is still recommended.
- **Failure rate seen by users is below 10 %** because of the automatic retry (see
  [Tradeoffs](#tradeoffs)).

---

## Tests

The tests focus on the hardest behaviour (races, stale data, URL state, failure handling,
focus management) rather than broad coverage.

**Unit and integration (Vitest + Testing Library + MSW in Node): 41 tests**

- `src/shared/orderQuery.test.ts`: URL parsing, per-field fallbacks, canonical
  serialisation, round-trip
- `src/mocks/*.test.ts`: dataset size, uniqueness and determinism; filtering, accent-insensitive
  search, sorting, pagination without gaps, stats; routing, 404, latency and failure rate
- `src/features/explorer/ExplorerPage.test.tsx`:
  - **Race condition:** a slow superseded response is never shown, and its request is aborted
  - **Debounce:** typing a word sends one request
  - Old rows are marked while a new query loads
  - URL restore, Back/Forward, page reset on filter change, repair of bad links
  - **Error + Retry with no stale rows**, **partial failure**, empty state, out-of-range page
- `src/features/detail/OrderDrawer.test.tsx`: opening and closing keeps the query and returns
  focus; deep link; 404; error + Retry; Back closes the drawer; arrow-key navigation in the grid

**End-to-end (Playwright, Chromium, against the production build): 11 tests**

- All 480 pages of 25 return 25 distinct orders; the data is identical after a reload
- API responses come from the service worker
- Refresh restores the exact view, including scroll position; real Back/Forward
- Keyboard-only flow; the page behind the open drawer never receives focus; Esc returns focus
  to the row
- Opening and closing the drawer keeps scroll position and filters; a deep link survives refresh
- Failures forced through the in-app simulator show an error and recover with Retry
- axe-core finds no WCAG 2.1 AA violations on the list or the drawer
- At mobile width: no sideways page scroll; filters open as a panel

---

## Sources and references

- TanStack Query: [query keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys),
  [query cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation),
  [placeholder data](https://tanstack.com/query/latest/docs/framework/react/guides/placeholder-query-data),
  [TypeScript (registering the error type)](https://tanstack.com/query/latest/docs/framework/react/typescript)
- TanStack Virtual: [Virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer)
  (`rangeExtractor`, `scrollMargin`)
- MSW: [browser integration](https://mswjs.io/docs/integrations/browser),
  [`delay`](https://mswjs.io/docs/api/delay)
- React Router: [`useSearchParams`](https://reactrouter.com/api/hooks/useSearchParams)
- React: [Adjusting some state when a prop changes](https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
- WAI-ARIA Authoring Practices: [Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/),
  [Dialog (modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- MDN: [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog),
  [`inert`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert),
  [ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions)
- [Zod](https://zod.dev)
- Testing: [Vitest](https://vitest.dev),
  [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/),
  [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing),
  [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)
- Vercel: [project configuration (`vercel.json`)](https://vercel.com/docs/project-configuration)
- mulberry32: a small public-domain seeded pseudo-random number generator, used for the dataset

---

## AI usage disclosure

This project was built with **Claude Code** (Anthropic's coding assistant, model Claude Opus
5.5) as a pair programmer.

**Conversation export:** `TODO: add the Claude conversation share link`

**How the AI was directed**

- I chose the problem statement after asking for an analysis of both options, then agreed
  the tech stack, architecture and a phased plan before any code was written.
- The work was done in phases (setup → mock API → URL state → data layer → UI → states →
  detail view → accessibility → tests → deployment config). Each phase had to be verified
  with tests or in a real browser before moving on.
- I set the quality bar: implement every requirement in the PDF, reuse working code instead
  of rewriting it, use no fake functionality, and confirm the dataset size by measuring it
  rather than hardcoding it.

**How the output was reviewed and corrected**

- I reported that the API appeared to return only 2–4 records. Investigation showed that the
  temporary Phase 1 page only *displayed* 3 records of each response. A check through the
  real service worker then confirmed 480 pages × 25 distinct orders = 12,000, and that check
  is now a permanent test.
- Browser tests caught problems that unit tests could not, and each was diagnosed before
  being changed:
  - A test fetched data before the mock service worker had started, so a readiness marker
    was added.
  - The mobile "Filters" button changed its label instead of relying on `aria-expanded`
    alone. The app was fixed.
  - A test assumed a stricter focus trap than native modal dialogs implement. The test was
    rewritten to check what matters: the page behind the drawer never receives focus.
- Subtle logic bugs were found in review before they reached the UI. For example, the
  debounced search input could restart its timer on unrelated re-renders, and could fail to
  follow the URL after Back followed by Forward.

All code was run, type-checked, linted and tested locally. The test counts and performance
figures in this README come from those runs.
