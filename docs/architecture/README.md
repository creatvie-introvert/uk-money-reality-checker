# Architecture boundary

The Next.js App Router owns routing and page composition. Components under `src/components` own presentation and interaction only.

M1 is data foundation only: UKMR Data Pack v3.1 integration, Zod schemas, provenance, release-status enforcement, generated release datasets and typed loaders. The calculator engine is explicitly deferred to M2. When implemented, it belongs under `src/engine` as pure TypeScript with no React dependency. M3 adds scenario comparison, cost-driver ranking and salary-preservation calculation.

Features under `src/features/calculator` coordinate domain use cases without moving financial rules into components.

The implemented M1 foundation flows from source catalogue through snapshot metadata, raw payload and a category adapter into normalized audit records with validation diagnostics. The source catalogue describes upstream evidence; adapters preserve source meaning while normalizing data. Generated releases and typed loaders are later M1 slices. The M2 engine then consumes those typed loaders; source spreadsheets are never a UI dependency. See `docs/data/README.md` for the offline ingestion contracts and unresolved catalogue metadata.


## Milestone 2 kickoff

The pure engine boundary now lives in `src/engine`, with typed generated-only loading, exact monetary helpers, input/output contracts and rent/council-tax/reference-resolution proofs. See [engine architecture](../engine/milestone-2-architecture.md). The earlier milestone descriptions above record the original foundation plan; full category arithmetic and aggregation remain incremental M2 work. UI continues to contain no financial logic.
