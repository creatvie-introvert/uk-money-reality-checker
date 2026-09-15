import type { DiagnosticCode, HouseholdCostCategory, ScenarioInput } from "@/engine";

const monthly = (amountGbp: string) => ({ amountGbp, period: "MONTHLY" as const });
export function completeInput(): ScenarioInput {
  return {
    household: { adults: 2, children: 0 },
    location: {
      cityId: "LOC-MAN", effectiveOn: "2026-09-14",
      housing: { bedrooms: 2, rentSourceMonth: "2026-07", overrides: {
        rent: monthly("1500"), councilTax: monthly("170"), energy: monthly("120"), water: monthly("55"),
      } },
      income: { grossAnnualSalaryGbp: "50000", taxJurisdiction: "rUK", taxYear: "2026/27", niCategory: "A", scope: "ONE_EMPLOYEE_ONE_EMPLOYMENT", calculationBasis: "ANNUAL_COMPARISON" },
      spending: { groceries: monthly("300"), essentials: monthly("80"), lifestyle: monthly("100") },
      transport: { status: "UNRESOLVED", override: monthly("70") },
    },
  };
}
function observedManchester(): ScenarioInput {
  const q = completeInput();
  delete q.location.housing.overrides.rent;
  delete q.location.housing.overrides.councilTax;
  q.location.housing.councilTax = { authorityName: "Manchester", band: "D" };
  return q;
}
interface AcceptanceFixture {
  id: string;
  purpose: string;
  current: ScenarioInput;
  destination: ScenarioInput;
  expected: {
    scenarioStates: readonly ["COMPLETE" | "PARTIAL" | "UNRESOLVED", "COMPLETE" | "PARTIAL" | "UNRESOLVED"];
    unresolved: readonly [readonly HouseholdCostCategory[], readonly HouseholdCostCategory[]];
    /** Annual equivalents make fractional monthly pennies readable; independent reviewed expectations. */
    netAnnual: readonly [string | null, string | null];
    completeCostsAnnual: readonly [string | null, string | null];
    comparison: "COMPLETE" | "PARTIAL" | "UNRESOLVED";
    annualDeltas: readonly [string | null, string | null, string | null]; // take-home, costs, residual
    ranking: "COMPLETE" | "PARTIAL";
    excluded: readonly HouseholdCostCategory[];
    firstDriver: HouseholdCostCategory;
    solver: "ELIGIBLE_SOLVED" | "INELIGIBLE";
    solvedGross?: string;
    diagnostics: readonly DiagnosticCode[];
  };
}
export function acceptanceFixtures(): AcceptanceFixture[] {
  const rukCurrent = observedManchester(), rukDestination = observedManchester();
  rukDestination.location.cityId = "LOC-LEE";
  rukDestination.location.housing.councilTax = { authorityName: "Leeds", band: "D" };
  rukDestination.location.housing.overrides.energy = monthly("140");
  rukDestination.location.transport = { status: "UNRESOLVED", override: monthly("90") };
  rukDestination.location.income.grossAnnualSalaryGbp = "60000";

  const scotCurrent = completeInput();
  scotCurrent.location.cityId = "LOC-GLA";
  scotCurrent.location.income.taxJurisdiction = "Scotland";
  scotCurrent.location.income.grossAnnualSalaryGbp = "60000";
  scotCurrent.location.housing.overrides = { energy: monthly("120") };
  scotCurrent.location.housing.councilTax = { authorityName: "Glasgow City", band: "D" };
  scotCurrent.location.housing.water = { billingRegime: "council_tax_band", band: "D", connectedServices: "combined" };
  const scotDestination = structuredClone(scotCurrent);
  scotDestination.location.income.grossAnnualSalaryGbp = "90000";
  scotDestination.location.housing.councilTax!.band = "E";
  scotDestination.location.housing.water!.band = "E";
  scotDestination.location.housing.overrides.energy = monthly("150");
  scotDestination.location.spending.groceries = monthly("320");

  const partial = completeInput();
  partial.location.cityId = "LOC-EDI";
  delete partial.location.housing.overrides.rent;
  delete partial.location.housing.overrides.energy;
  partial.location.transport = { status: "UNRESOLVED" };

  const overrideCurrent = observedManchester(), overrideDestination = completeInput();
  overrideCurrent.location.income.netMonthlyIncomeOverride = { ...monthly("2800"), note: "Actual monthly take-home" };
  overrideDestination.location.income.netMonthlyIncomeOverride = monthly("2900");
  overrideDestination.location.housing.councilTax = { authorityName: "Manchester", band: "D" };
  overrideDestination.location.housing.overrides.rent!.note = "Signed tenancy";

  const absentGross = completeInput(); delete absentGross.location.income.grossAnnualSalaryGbp;
  const missingEnergy = completeInput(); delete missingEnergy.location.housing.overrides.energy;
  const negative = completeInput(), cheaper = completeInput();
  negative.location.income = { netMonthlyIncomeOverride: monthly("2000") };
  negative.location.housing.overrides.rent = monthly("1305"); // £2200 total, residual -£200
  cheaper.location.housing.overrides.rent = monthly("605"); // £1500 total

  return [
    { id: "A-ruk", purpose: "Observed Manchester → Leeds housing with complete explicit household inputs", current: rukCurrent, destination: rukDestination,
      expected: { scenarioStates: ["COMPLETE", "COMPLETE"], unresolved: [[], []], netAnnual: ["39519.60", "45357.40"], completeCostsAnnual: ["25736.04", "23103.73"], comparison: "COMPLETE", annualDeltas: ["5837.80", "-2632.31", "8470.11"], ranking: "COMPLETE", excluded: [], firstDriver: "rent", solver: "ELIGIBLE_SOLVED", solvedGross: "46344.02", diagnostics: ["ANNUALISED_NI_COMPARISON"] } },
    { id: "B-scotland", purpose: "Glasgow Band D → E, Scottish income, observed rent and combined Scottish Water", current: scotCurrent, destination: scotDestination,
      expected: { scenarioStates: ["COMPLETE", "COMPLETE"], unresolved: [[], []], netAnnual: ["43607.35", "59957.35"], completeCostsAnnual: ["23454.32", "24734.77"], comparison: "COMPLETE", annualDeltas: ["16350", "1280.45", "15069.55"], ranking: "COMPLETE", excluded: [], firstDriver: "council_tax", solver: "ELIGIBLE_SOLVED", solvedGross: "62286.52", diagnostics: ["ANNUALISED_NI_COMPARISON"] } },
    { id: "C-partial", purpose: "Edinburgh rent, energy and transport gaps remain visible", current: completeInput(), destination: partial,
      expected: { scenarioStates: ["COMPLETE", "PARTIAL"], unresolved: [[], ["rent", "energy", "transport"]], netAnnual: ["39519.60", "39519.60"], completeCostsAnnual: ["28740", null], comparison: "PARTIAL", annualDeltas: ["0", null, null], ranking: "PARTIAL", excluded: ["rent", "energy", "transport"], firstDriver: "council_tax", solver: "INELIGIBLE", diagnostics: ["EDINBURGH_RENT_SOURCE_UNRESOLVED", "ENERGY_MODEL_REQUIRED", "TRANSPORT_CITY_DEFAULT_PRODUCT_UNRESOLVED", "DESTINATION_COSTS_INCOMPLETE"] } },
    { id: "D-overrides", purpose: "Mixed observed/calculated/user-entered sides with effective net overrides and retained baselines", current: overrideCurrent, destination: overrideDestination,
      expected: { scenarioStates: ["COMPLETE", "COMPLETE"], unresolved: [[], []], netAnnual: ["33600", "34800"], completeCostsAnnual: ["25736.04", "28740"], comparison: "COMPLETE", annualDeltas: ["1200", "3003.96", "-1803.96"], ranking: "COMPLETE", excluded: [], firstDriver: "rent", solver: "INELIGIBLE", diagnostics: ["NET_INCOME_OVERRIDE_APPLIED", "DESTINATION_NET_OVERRIDE_CONFLICT"] } },
    { id: "E-solver-eligible", purpose: "Destination has complete costs but no existing gross or income result", current: completeInput(), destination: absentGross,
      expected: { scenarioStates: ["COMPLETE", "UNRESOLVED"], unresolved: [[], []], netAnnual: ["39519.60", null], completeCostsAnnual: ["28740", "28740"], comparison: "PARTIAL", annualDeltas: [null, "0", null], ranking: "COMPLETE", excluded: [], firstDriver: "rent", solver: "ELIGIBLE_SOLVED", solvedGross: "50000.00", diagnostics: ["BASELINE_INCOME_UNAVAILABLE", "SCENARIO_INCOME_UNRESOLVED", "SALARY_PRESERVATION_SOLVED"] } },
    { id: "F-solver-ineligible", purpose: "One missing destination bill is enough to prohibit preservation estimates", current: completeInput(), destination: missingEnergy,
      expected: { scenarioStates: ["COMPLETE", "PARTIAL"], unresolved: [[], ["energy"]], netAnnual: ["39519.60", "39519.60"], completeCostsAnnual: ["28740", null], comparison: "PARTIAL", annualDeltas: ["0", null, null], ranking: "PARTIAL", excluded: ["energy"], firstDriver: "rent", solver: "INELIGIBLE", diagnostics: ["ENERGY_MODEL_REQUIRED", "DESTINATION_COSTS_INCOMPLETE"] } },
    { id: "G-negative", purpose: "Preserve negative £200 monthly residual with £1500 destination costs", current: negative, destination: cheaper,
      expected: { scenarioStates: ["COMPLETE", "COMPLETE"], unresolved: [[], []], netAnnual: ["24000", "39519.60"], completeCostsAnnual: ["26400", "18000"], comparison: "COMPLETE", annualDeltas: ["15519.60", "-8400", "23919.60"], ranking: "COMPLETE", excluded: [], firstDriver: "rent", solver: "ELIGIBLE_SOLVED", solvedGross: "16778.34", diagnostics: ["NET_INCOME_OVERRIDE_APPLIED", "SALARY_PRESERVATION_SOLVED"] } },
    { id: "H-no-change", purpose: "Identical complete scenarios retain all eight zero category deltas", current: completeInput(), destination: completeInput(),
      expected: { scenarioStates: ["COMPLETE", "COMPLETE"], unresolved: [[], []], netAnnual: ["39519.60", "39519.60"], completeCostsAnnual: ["28740", "28740"], comparison: "COMPLETE", annualDeltas: ["0", "0", "0"], ranking: "COMPLETE", excluded: [], firstDriver: "rent", solver: "ELIGIBLE_SOLVED", solvedGross: "50000.00", diagnostics: ["SALARY_PRESERVATION_SOLVED"] } },
  ];
}
