// The only production JSON imports in the engine. Refresh through an audited release change.
import energyConsumption from "../../data/generated/2024-v1/energy-consumption/reference.json";
import rent from "../../data/generated/2026-07-v1/rent/release.json";
import transport from "../../data/generated/2026-09-v1/transport/release.json";
import councilTax from "../../data/generated/2026-27-v1/council-tax/release.json";
import incomeTax from "../../data/generated/2026-27-v1/income-tax.reference.json";
import nationalInsurance from "../../data/generated/2026-27-v1/national-insurance.reference.json";
import water from "../../data/generated/2026-27-v1/water/release.json";
import energyPrice from "../../data/generated/2026-q3-v1/energy-prices/release.json";
import groceries from "../../data/generated/fye2024-v1/groceries/reference.json";
import householdSpending from "../../data/generated/fye2025-v1/household-spending/reference.json";

export const activeDatasets = {
  energyConsumption: { artifact: energyConsumption, releaseId: "ukmr-need-2024-v1", schemaVersion: "1.4.0", kind: "REFERENCE_ARTIFACT", category: "energy_consumption", recordCount: 784, sourcePeriod: "2024" },
  rent: { artifact: rent, releaseId: "ukmr-rent-2026-07-v1", schemaVersion: "1.3.0", kind: "DIRECT_EVIDENCE_RELEASE", category: "rent", recordCount: 35, sourcePeriod: "2026-07" },
  transport: { artifact: transport, releaseId: "ukmr-transport-2026-09-v1", schemaVersion: "1.7.0", kind: "DIRECT_EVIDENCE_RELEASE", category: "transport_fare", recordCount: 25, sourcePeriod: "Current fare verified 2026-09-14" },
  councilTax: { artifact: councilTax, releaseId: "ukmr-council-tax-2026-27-v1", schemaVersion: "1.2.0", kind: "DIRECT_EVIDENCE_RELEASE", category: "council_tax", recordCount: 56, sourcePeriod: "2026/27" },
  incomeTax: { artifact: incomeTax, releaseId: "ukmr-income-tax-2026-27-v1", schemaVersion: "1.1.0", kind: "REFERENCE_ARTIFACT", category: "income_tax_rule", recordCount: 15, sourcePeriod: "2026/27" },
  nationalInsurance: { artifact: nationalInsurance, releaseId: "ukmr-national-insurance-2026-27-v1", schemaVersion: "1.1.0", kind: "REFERENCE_ARTIFACT", category: "national_insurance_rule", recordCount: 9, sourcePeriod: "2026/27" },
  water: { artifact: water, releaseId: "ukmr-water-2026-27-v1", schemaVersion: "1.5.0", kind: "DIRECT_EVIDENCE_RELEASE", category: "water_tariff", recordCount: 56, sourcePeriod: "2026/27" },
  energyPrice: { artifact: energyPrice, releaseId: "ukmr-ofgem-2026-q3-v1", schemaVersion: "1.4.0", kind: "DIRECT_EVIDENCE_RELEASE", category: "energy_price", recordCount: 126, sourcePeriod: "2026-Q3" },
  groceries: { artifact: groceries, releaseId: "ukmr-groceries-fye2024-v1", schemaVersion: "1.6.0", kind: "REFERENCE_ARTIFACT", category: "grocery_expenditure", recordCount: 32, sourcePeriod: "FYE 2024" },
  householdSpending: { artifact: householdSpending, releaseId: "ukmr-household-spending-fye2025-v1", schemaVersion: "1.6.0", kind: "REFERENCE_ARTIFACT", category: "coicop_expenditure", recordCount: 53, sourcePeriod: "FYE 2025" },
} as const;
export type DatasetKey = keyof typeof activeDatasets;
export const engineDatasetVersion = "m2-kickoff-m1-20260914-v1" as const;
