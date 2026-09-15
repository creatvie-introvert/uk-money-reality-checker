# Calculator feature

The [Milestone 3 design handoff](../../../docs/product/milestone-3-design-handoff.md) defines the approved prototype mapping and product/UI boundary:

`form draft → input adapter → Milestone 2 engine → result composer → UI view model → React presentation`

The audited engine owns financial arithmetic and availability. The approved reference image owns visual direction; HTML supplies journey/results structure. Prototype numbers, profiles and defaults are not production inputs.

The pure product pipeline and first React results proof are implemented. See [Milestone 3 architecture](../../../docs/product/milestone-3-architecture.md) for contracts, state/privacy decisions, validation and remaining form wiring.

Run `npm run dev` and open `/dev/calculator-results` for explicitly labelled, engine-calculated development fixtures. This route returns 404 in production. `/calculator/results` contains an honest empty state until the form journey is connected. Fixture inputs are never production defaults.
