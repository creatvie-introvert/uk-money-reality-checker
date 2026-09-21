# UK Money Reality

UK Money Reality is being rebuilt as an evidence-based UK relocation affordability platform. The MVP supports London, Birmingham, Manchester, Leeds, Liverpool, Bristol, Edinburgh and Glasgow. International expansion is out of scope for this MVP.

This branch contains Milestone 0: the production engineering foundation. The approved product specification, data architecture, calculator specification, UX flow, visual design system and high-fidelity prototype remain the authority for later implementation. The calculator formulas, seven-step experience, report and UKMR Data Pack v3.1 integration are not implemented yet.

## Stack

- Next.js App Router and React
- TypeScript with strict checking
- Zod and React Hook Form for the approved data and form layers
- Vitest for unit tests
- Playwright for browser tests
- Vercel-compatible Next.js production build

The calculator engine will be introduced in M2 as framework-independent TypeScript. React components must not perform substantive financial calculations or consume source spreadsheets directly.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to view the temporary development shell.

For physical-phone testing on the same Wi-Fi, open `http://192.168.1.20:3000/calculator`.
`next.config.ts` explicitly allows this Mac's current LAN address and `127.0.0.1`
for Next.js development connections. If the Mac's LAN address changes, replace
that address in `allowedDevOrigins` and restart `npm run dev`; do not use a wildcard.
A rejected development connection can leave the server-rendered calculator disabled
because it has not hydrated. This allowlist applies only to `next dev`.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

The browser test starts the local Next.js development server automatically. Playwright browsers may need to be installed once with `npx playwright install chromium`.

## Legacy coexistence

The previous GitHub Pages implementation remains in the root-level HTML, CSS, JavaScript and image files. It is preserved at the `legacy-static-v1` tag and has not been copied into React components. The rebuild lives in `src/app` and currently coexists with those legacy files. This milestone does not change DNS, GitHub Pages settings, the production domain or deployment configuration.

## Data and calculator specifications

The application data specification and calculator specification are separate from the application implementation and must be followed independently. The intended data flow is:

```text
UKMR Data Pack -> import -> Zod validation -> release-status validation
  -> generated release dataset -> typed loader -> calculator engine (M2) -> UI
```

Observed, calculated, modelled and user-entered values must remain distinct, with source values, provenance and effective dates preserved. `BLOCKED_FROM_RELEASE` data must never enter a public calculation. The data validation command and Data Pack importer will be added in a later milestone; no UKMR Data Pack has been imported or transformed here.

See `docs/architecture`, `docs/data`, `docs/calculator` and `docs/release` for the current boundaries and milestone notes.

## Milestone sequence

- M1: Data foundation only: UKMR Data Pack v3.1 integration, Zod schemas, provenance, release-status enforcement, generated release datasets and typed loaders.
- M2: Framework-independent calculator engine.
- M3: Scenario comparison, cost-driver ranking and salary-preservation calculation.
