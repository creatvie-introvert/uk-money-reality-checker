import type { MvpCityId, Jurisdiction } from "../../data/schemas/enums";
import type { DatasetKey } from "./datasets";
import type { EvidenceMetadata, RuntimeEvidenceRecord } from "./runtime-types";

/** Shared exact selectors; no dataset imports or IO. */
export function createEvidenceQueries(metadata: EvidenceMetadata, records: <K extends DatasetKey>(key: K) => readonly RuntimeEvidenceRecord<K>[]) {
  return Object.freeze({
    metadata,
    getRentEvidence: (q: { cityId: MvpCityId; bedroomBand: string; sourcePeriod: string }) => records("rent").filter((r) => r.geography.mvpCityId === q.cityId && r.bedroomBand === q.bedroomBand && r.sourcePeriod === q.sourcePeriod),
    getCouncilTaxEvidence: (q: { cityId: MvpCityId; authorityName: string; authorityCode?: string; band: string; effectiveOn: string }) => records("councilTax").filter((r) => r.geography.mvpCityId === q.cityId && r.geography.official.name === q.authorityName && (q.authorityCode === undefined || r.geography.official.code === q.authorityCode) && r.band === q.band && r.effectiveFrom <= q.effectiveOn && r.effectiveTo >= q.effectiveOn),
    getTaxReference: (q: { jurisdiction: Jurisdiction; taxYear: string }) => records("incomeTax").filter((r) => r.jurisdiction === q.jurisdiction && r.taxYear === q.taxYear),
    getNiReference: (q: { taxYear: string; categoryLetter: string; payPeriod: "weekly" | "monthly" | "annual" }) => records("nationalInsurance").filter((r) => r.taxYear === q.taxYear && r.class === "Class 1" && r.categoryLetter === q.categoryLetter && r.payPeriod === q.payPeriod),
    getWaterEvidence: (providerId: string) => records("water").filter((r) => r.providerId === providerId),
    getEnergyPriceEvidence: (q: { region: string; effectiveOn: string }) => records("energyPrice").filter((r) => r.geography.official.name === q.region && r.effectiveFrom <= q.effectiveOn && r.effectiveTo >= q.effectiveOn),
    getEnergyConsumptionInputs: () => records("energyConsumption"),
    getGroceryReference: () => records("groceries"),
    getHouseholdSpendingReference: () => records("householdSpending"),
    getTransportProducts: (q: { cityId: MvpCityId; effectiveOn: string }) => records("transport").filter((r) => r.applicability.cityIds.includes(q.cityId) && r.effectiveFrom <= q.effectiveOn && (!r.effectiveTo || r.effectiveTo >= q.effectiveOn)),
    hasTransportProduct: (id: string) => records("transport").some((r) => r.recordId === id),
  });
}
