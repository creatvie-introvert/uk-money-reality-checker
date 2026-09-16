# Report components

`ResultsPage.tsx` renders the product results view model using the approved Milestone 3 hierarchy and scoped styles. It performs no financial calculations or evidence resolution. See [the product architecture](../../../docs/product/milestone-3-architecture.md) for production in-memory handoff and the isolated development preview. Optional navigation callbacks connect result editing and restart without putting calculations in presentation.

`CostBreakdown.tsx` owns only disclosure state: native buttons open a four-column evidence row, within the category card on mobile. `SourceExplanation.tsx` renders unchanged provenance and date formatting. Neither resolves evidence or calculates amounts. See [closure QA](../../../docs/product/milestone-3-closure.md).
