import { validateDataset, type EvidenceRecord } from "@/engine/loaders";
import { activeDatasets, type DatasetKey } from "@/engine/loaders/datasets";
import { cityDefinitions } from "@/product/cities/registry";
import { projectSourceCitations, type PublicSource } from "./provenance";

export type SourceGroupId = "rent" | "council-tax" | "energy" | "water" | "spending" | "transport" | "income-tax" | "national-insurance";
export type SourceUseStatus = "Used in calculator" | "Used with conditions" | "Reference only";
export interface PublicSourceEntry {
  id: string;
  category: SourceGroupId;
  organisation: string;
  title: string;
  classification: "Official data";
  evidenceRole: "Published evidence" | "Reference evidence only";
  useStatus: SourceUseStatus;
  howUsed: string;
  geography: readonly string[];
  scope: readonly string[];
  publicationDates: readonly string[];
  citations: readonly PublicSource[];
  limitations: readonly string[];
}
export interface PublicSourceGroup {
  id: SourceGroupId;
  title: string;
  introduction: string;
  entries: readonly PublicSourceEntry[];
}
const groupDefinitions: readonly Omit<PublicSourceGroup, "entries">[] = [
  { id: "rent", title: "Rent", introduction: "ONS PIPR evidence retains the source geography and bedroom meaning. Edinburgh has no exact city row; Greater Glasgow is not Glasgow City." },
  { id: "council-tax", title: "Council tax", introduction: "England and Scotland use authority-and-band evidence. London needs a borough or authority; no generic London amount or released borough schedule is available here." },
  { id: "energy", title: "Energy", introduction: "NEED consumption references and Ofgem regional price evidence have different roles. Neither establishes a household bill from city alone." },
  { id: "water", title: "Water", introduction: "Provider identity alone does not establish a personal bill. Bristol Water supplies clean water and Wessex Water supplies wastewater in the Bristol mapping." },
  { id: "spending", title: "Groceries and household spending", introduction: "National reference expenditure does not automatically become a city or household budget. The calculator asks for your groceries, essentials and lifestyle amounts." },
  { id: "transport", title: "Transport", introduction: "Selected published fare products only. The current form accepts your monthly transport amount; fare-product selection is deferred. These observations do not establish fares after 14 September 2026." },
  { id: "income-tax", title: "Income tax", introduction: "Published reference rules feed the deterministic employment calculation. You explicitly confirm rUK or Scottish jurisdiction; city does not determine taxpayer status." },
  { id: "national-insurance", title: "National Insurance", introduction: "Employee Class 1 category A reference rules support the annual comparison. The employer publication title does not mean employer NI is included." },
];
const groupFor: Record<DatasetKey, SourceGroupId> = { rent: "rent", councilTax: "council-tax", energyConsumption: "energy", energyPrice: "energy", water: "water", groceries: "spending", householdSpending: "spending", transport: "transport", incomeTax: "income-tax", nationalInsurance: "national-insurance" };
const unique = (values: readonly string[]) => [...new Set(values)];
type RecordType = EvidenceRecord<DatasetKey>;

function context(key: DatasetKey, records: readonly RecordType[]) {
  const first = records[0];
  const defaults = { geography: [] as string[], scope: [] as string[], useStatus: "Reference only" as SourceUseStatus, howUsed: "", limitations: [] as string[] };
  switch (key) {
    case "rent": return { ...defaults, useStatus: "Used with conditions" as const,
      geography: unique(records.flatMap((r) => r.category === "rent" ? [`${r.geography.official.name}${r.geography.official.code ? ` (${r.geography.official.code})` : ""} — ${r.geography.official.geographyType.replaceAll("_", " ")}`] : [])),
      scope: ["Published rent observations; selected bedroom bands and all-properties measure."],
      howUsed: "Exact city, bedroom and source-month matches can supply published rent. Your entered rent takes precedence where supported.",
      limitations: ["July 2026 rental-stock observations are not quotes for a specific property. Local estimates can be volatile.", "Bedroom and property-type dimensions are separate; no unsupported cross-product is constructed.", "London is regional. Greater Glasgow is a broad rental market area, not Glasgow City. Edinburgh has no exact PIPR city row and no substitute is used.", "Scottish data relies mainly on advertised new lets and has source quality qualifications."] };
    case "councilTax": return { ...defaults, useStatus: "Used with conditions" as const,
      geography: unique(records.flatMap((r) => r.category === "council_tax" ? [`${r.geography.official.name}${r.geography.official.code ? ` (${r.geography.official.code})` : ""}`] : [])),
      scope: ["Published local-authority band schedules for 2026/27."],
      howUsed: "An explicit authority and actual band select the annual charge. The monthly equivalent is calculated by dividing by 12.",
      limitations: ["No generic London council-tax amount or released borough schedule. Band D is not a default.", "English area charges include applicable precepts on a two-adult basis. Scottish published band structures are preserved.", "Discounts and exemptions are not automatically calculated; use an actual amount where the simplified evidence path does not represent your bill."] };
    case "energyConsumption": return { ...defaults,
      geography: ["Selected England and Wales profiles; separate Scottish profiles."], scope: ["National Energy Efficiency Data-Framework (NEED): selected consumption profiles, source year 2024."],
      howUsed: "Reference context only. The calculator uses your monthly energy amount; no household consumption model is applied.",
      limitations: ["There is no city/adult-occupancy joint profile and retained profile coverage is partial.", "The 2024 source label retains gas mid-May 2024–mid-May 2025 and electricity February 2024–January 2025 qualifications. The 2026 publication date is not the consumption year."] };
    case "energyPrice": return { ...defaults,
      geography: unique(records.flatMap((r) => r.category === "energy_price" ? [r.geography.official.name] : [])), scope: ["Regional unit rates and standing charges, with fuel/tariff and payment-method conditions."],
      howUsed: "Published regional evidence approved for the selected period, but reference context in the current personal calculator path. Enter your own household amount.",
      limitations: ["No approved automatic city-to-price-cap-region mapping. A region named London does not authorise assigning every London household to it.", "Selected evidence is Q3 2026, 1 July–30 September. Later-quarter page headings do not change that period.", "The recorded links are Ofgem’s embedded regional charts. Export stability and reuse permission remain unresolved; no tariff table is republished here."] };
    case "water": {
      if (first.category !== "water_tariff") throw new Error("Unexpected water evidence");
      const provider = first.providerId;
      const cities = cityDefinitions.filter((c) => (c.waterProviders as readonly string[]).includes(provider));
      const scottish = provider === "scottish-water";
      return { ...defaults, useStatus: scottish ? "Used with conditions" as const : "Reference only" as const,
        geography: cities.map((c) => `${c.displayName} — audited provider/service mapping`),
        scope: [provider === "bristol-water" ? "Clean water: Bristol Water. Wastewater is separately mapped to Wessex Water." : provider === "wessex-water" ? "Bristol wastewater: Wessex Water. Clean water is separately mapped to Bristol Water." : scottish ? "Scottish Water unmetered clean-water and wastewater band schedules." : "Selected clean-water and wastewater tariff components; billing regime and service conditions apply."],
        howUsed: scottish ? "Supported unmetered paths use your actual council-tax band and connected services. Annual charges become calculated monthly equivalents; a combined total is used only once." : "Tariff and service context only in the current household flow. Enter your monthly bill; provider identity alone cannot resolve it.",
        limitations: [scottish ? "Metered Scottish charging is unsupported. Confirm band and services; do not add component charges again to a combined total." : "Billing regime, usage and address/service applicability are needed. No automatic English household water bill is produced.", ...(provider === "severn-trent" ? ["Birmingham zone and surface-water drainage applicability remain unresolved in some paths."] : []), ...(["bristol-water", "wessex-water"].includes(provider) ? ["A supported Bristol clean-water path does not automatically establish a corresponding wastewater path."] : []), "Provider reuse terms remain unresolved; publication of a source link does not grant unrestricted reuse."] };
    }
    case "groceries": return { ...defaults, geography: ["United Kingdom; national reference expenditure."], scope: ["Defra Family Food: selected per-person, per-week food and drink expenditure."],
      howUsed: "Reference only. Current calculator groceries use your entered monthly amount.",
      limitations: ["Not a city-specific household estimate. Categories can overlap; no household multiplier is applied.", "A weekly × 52 / 12 reference equivalent is a deterministic calculated derivative, not observed monthly spending. No such amounts are presented in this register.", "FYE 2024 is the source period, distinct from the recorded publication date."] };
    case "householdSpending": return { ...defaults, geography: ["United Kingdom; all-households reference expenditure."], scope: ["ONS Family Spending detailed expenditure table; source category definitions retained."],
      howUsed: "Reference only; not automatically mapped into personalised Essentials or Lifestyle budgets. Enter your own amounts.",
      limitations: ["Parent and child expenditure categories can overlap. The selected table’s sequential category identifiers are not an approved personal-budget or COICOP mapping.", "No household model or OECD equivalence-scale spending multiplier is used. Deterministic monthly equivalents, where calculated from weekly evidence, remain Calculated."] };
    case "transport": return { ...defaults,
      geography: unique(records.flatMap((r) => r.category === "transport_fare" ? [r.network] : [])),
      scope: unique(records.flatMap((r) => r.category === "transport_fare" ? [r.productName] : [])),
      howUsed: "Published product context. The current form accepts explicit monthly household transport cost; fare-product selection is deferred. The underlying engine’s supported period conversions do not imply an automatic commute budget.",
      limitations: ["Verified 14 September 2026 with same-day evidence bounds, not a claimed commencement or withdrawal date. Later-date use requires refreshed evidence.", "Product, passenger, zone, mode, payment and airport conditions apply. Selected products are not exhaustive coverage.", "No cheapest-product choice, commute frequency or automatic monthly estimate is assumed. Operator reuse terms remain unresolved.", ...(first.provenance.organisation.includes("Bristol") ? ["A supporting historical fare-date conflict remains; the verified observation is not extended into a historical interval."] : [])] };
    case "incomeTax": return { ...defaults, useStatus: "Used in calculator" as const,
      geography: unique(records.flatMap((r) => r.category === "income_tax_rule" ? [r.jurisdiction === "Scotland" ? "Scottish income tax jurisdiction" : "rUK income tax jurisdiction"] : [])), scope: ["Published rates, bands and standard Personal Allowance rules for 2026/27."],
      howUsed: "Reference rules are inputs to deterministic tax and take-home calculations. The resulting tax and income values are Calculated, not observed personal pay.",
      limitations: ["One employee, one employment and annual gross salary; explicitly selected jurisdiction, never inferred from city.", "No pensions, student loans, benefits, multiple employment, self-employment or unsupported tax-code/payroll variations. This is an annual comparison, not a payslip reconstruction."] };
    case "nationalInsurance": return { ...defaults, useStatus: "Used in calculator" as const,
      geography: ["United Kingdom employee Class 1 National Insurance."], scope: ["Category A thresholds/rates; the current calculator uses the annual-comparison basis."],
      howUsed: "Reference inputs to deterministic employee NI and take-home calculations for 2026/27.",
      limitations: ["Employer NI is excluded despite the source publication’s title. No other NI category, employment aggregation or payroll reconstruction is implied.", "Recorded weekly/monthly reference thresholds do not change the current annual-comparison basis."] };
  }
}

/** Only the pinned production payloads can enter this public register. No source-catalogue/QA dump. */
export function buildSourceRegister(inputs?: Partial<Record<DatasetKey, unknown>>): readonly PublicSourceGroup[] {
  const entries: PublicSourceEntry[] = [];
  for (const key of Object.keys(activeDatasets) as DatasetKey[]) {
    const artifact = validateDataset(key, inputs && key in inputs ? inputs[key] : activeDatasets[key].artifact);
    const buckets = new Map<string, RecordType[]>();
    for (const record of artifact.records as readonly RecordType[]) {
      // Distinct publications stay distinct even when they share a source family ID.
      const identity = JSON.stringify([record.provenance.sourceId, record.provenance.organisation, record.provenance.publicationTitle]);
      buckets.set(identity, [...(buckets.get(identity) ?? []), record]);
    }
    let position = 0;
    for (const records of buckets.values()) {
      const first = records[0];
      entries.push({ id: `${key}-${++position}`, category: groupFor[key], organisation: first.provenance.organisation, title: first.provenance.publicationTitle,
        classification: "Official data", evidenceRole: first.releaseStatus === "REFERENCE_ONLY" ? "Reference evidence only" : "Published evidence",
        ...context(key, records), publicationDates: unique(records.flatMap((r) => r.provenance.publicationDate ? [r.provenance.publicationDate] : [])), citations: projectSourceCitations(records).map((citation) => {
          const sourceRecords = records.filter((r) => r.provenance.sourceUrl === citation.url);
          const labels = unique(sourceRecords.flatMap((r) => r.category === "energy_price"
            ? [`${r.fuel}${r.electricityTariffType ? `, ${r.electricityTariffType}` : ""}, ${r.paymentMethod}`]
            : r.category === "energy_consumption" ? [r.sourceNationGroup] : []));
          return { ...citation, ...(labels.length ? { linkContext: labels.join("; ") } : {}) };
        }) });
    }
  }
  return groupDefinitions.map((group) => ({ ...group, entries: entries.filter((entry) => entry.category === group.id) }));
}
