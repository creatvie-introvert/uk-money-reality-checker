# Calculator feature

The [Milestone 3 design handoff](../../../docs/product/milestone-3-design-handoff.md) defines the approved prototype mapping and product/UI boundary:

`form draft → input adapter → Milestone 2 engine → result composer → UI view model → React presentation`

The audited engine owns financial arithmetic and availability. The approved reference image owns visual direction; HTML supplies journey/results structure. Prototype numbers, profiles and defaults are not production inputs.

The pure product pipeline, production calculator journey and results handoff are implemented. See [Milestone 3 architecture](../../../docs/product/milestone-3-architecture.md) for contracts, state/privacy decisions, validation and the completed form wiring.

Start at `/calculator`. The shared calculator layout keeps one canonical draft and latest result in memory across six input steps, review and `/calculator/results`. Refresh clears them. See [journey details](../../../docs/product/calculator-journey.md).

Run `npm run dev` and open `/dev/calculator-results` for isolated, engine-calculated development fixtures. This route returns 404 in production. Fixture inputs are never production defaults.

See [Milestone 3 closure audit](../../../docs/product/milestone-3-closure.md) for the current GO recommendation, acceptance cases and remaining device/asset limitations.
