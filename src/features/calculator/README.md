# Calculator feature

The [Milestone 3 design handoff](../../../docs/product/milestone-3-design-handoff.md) defines the approved prototype mapping and product/UI boundary:

`form draft → input adapter → Milestone 2 engine → result composer → UI view model → React presentation`

The audited engine owns financial arithmetic and availability. The approved reference image owns visual direction; HTML supplies journey/results structure. Prototype numbers, profiles and defaults are not production inputs.

Implement the pure adapter/composer contracts and acceptance tests before React presentation. The proposed module boundaries and state rules are specified in the handoff; runtime feature modules and UI are not yet implemented.
