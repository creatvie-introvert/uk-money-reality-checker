import type { MvpCityId } from "@/data/schemas/enums";
import { validateDataset } from "@/engine/loaders";
import { activeDatasets, type DatasetKey } from "@/engine/loaders/datasets";
import type { EvidenceRecord } from "@/engine/loaders";

interface CityDefinition {
  slug: string;
  displayName: string;
  nation: "England" | "Scotland";
  calculatorCityId: MvpCityId;
  summary: string;
  waterProviders: readonly string[];
  waterContext: string;
}
// Audited service mappings and exceptions: docs/data/milestone-1-closure.md, sections D/G.
// Order is the established MVP order, unrelated to costs or evidence completeness.
export const cityDefinitions = [
  { slug: "london", displayName: "London", nation: "England", calculatorCityId: "LOC-LON", summary: "Regional rent evidence. Council tax needs a borough or authority; no generic London amount is supported.", waterProviders: ["thames-water"], waterContext: "Thames Water service mapping. The applicable bill still depends on billing regime, usage and service eligibility." },
  { slug: "birmingham", displayName: "Birmingham", nation: "England", calculatorCityId: "LOC-BIR", summary: "Local authority rent and council-tax evidence. Some water billing paths remain unresolved.", waterProviders: ["severn-trent"], waterContext: "Severn Trent service mapping. Zone and surface-water drainage applicability remain unresolved in some billing paths; there is no automatic household water bill." },
  { slug: "manchester", displayName: "Manchester", nation: "England", calculatorCityId: "LOC-MAN", summary: "Local authority rent and council-tax evidence, with conditional water and selected transport evidence.", waterProviders: ["united-utilities"], waterContext: "United Utilities service mapping. Billing regime, usage and applicable services are needed to establish a household bill." },
  { slug: "leeds", displayName: "Leeds", nation: "England", calculatorCityId: "LOC-LEE", summary: "Local authority rent and council-tax evidence. Household spending still needs your own amounts.", waterProviders: ["yorkshire-water"], waterContext: "Yorkshire Water service mapping. Billing regime, usage and applicable services are needed to establish a household bill." },
  { slug: "liverpool", displayName: "Liverpool", nation: "England", calculatorCityId: "LOC-LIV", summary: "Local authority rent and council-tax evidence, with conditional water and selected transport evidence.", waterProviders: ["united-utilities"], waterContext: "United Utilities service mapping. Billing regime, usage and applicable services are needed to establish a household bill." },
  { slug: "bristol", displayName: "Bristol", nation: "England", calculatorCityId: "LOC-BRS", summary: "Local authority rent and council-tax evidence. Clean water and wastewater have separate providers.", waterProviders: ["bristol-water", "wessex-water"], waterContext: "Split provision: clean water = Bristol Water; wastewater = Wessex Water. Keep the services separate. Supported clean-water paths do not automatically establish a matching wastewater path." },
  { slug: "edinburgh", displayName: "Edinburgh", nation: "Scotland", calculatorCityId: "LOC-EDI", summary: "No exact published PIPR rent row. Scottish council-tax schedules and conditional band-based water evidence are available.", waterProviders: ["scottish-water"], waterContext: "Scottish Water unmetered charges are tied to the actual council-tax band and included services. The calculator can resolve supported band-based paths. Metered Scottish charging is not supported by this evidence." },
  { slug: "glasgow", displayName: "Glasgow", nation: "Scotland", calculatorCityId: "LOC-GLA", summary: "Rent evidence covers Greater Glasgow, not Glasgow City. Scottish council-tax and band-based water evidence have their own scope.", waterProviders: ["scottish-water"], waterContext: "Scottish Water unmetered charges are tied to the actual council-tax band and included services. The calculator can resolve supported band-based paths. Metered Scottish charging is not supported by this evidence." },
] as const satisfies readonly CityDefinition[];

export type CitySlug = typeof cityDefinitions[number]["slug"];
export type CoverageState = "Published evidence available" | "Supported with conditions" | "Evidence gap" | "Requires your amount" | "Reference evidence only";
export type CoverageCategory = "rent" | "council_tax" | "energy" | "water" | "groceries" | "essentials" | "lifestyle" | "transport";
export interface PublicSource {
  organisation: string;
  title: string;
  url: string;
  period: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  classification: "Published evidence" | "Reference evidence only";
}
export interface CityCoverageItem {
  id: CoverageCategory;
  label: string;
  state: CoverageState;
  summary: string;
  context: readonly string[];
  sources: readonly PublicSource[];
}
export interface CityPageModel {
  city: typeof cityDefinitions[number];
  coverage: readonly CityCoverageItem[];
  calculatorHref: "/calculator";
  taxContext: string;
}
export const findCity = (slug: string) => cityDefinitions.find((city) => city.slug === slug);
export const cityMetadata = (city: typeof cityDefinitions[number]) => ({
  title: `${city.displayName} living-cost evidence | UK Money Reality`,
  description: `See which rent, council tax, water, transport and household-cost evidence UK Money Reality supports for ${city.displayName} before comparing your move.`,
});

// Explicit allowlist projection: never serialize price fields, QA payloads or modelled fixtures.
// Source context is editorial coverage copy, not a redistribution of provider tariff tables.
function sources(records: readonly EvidenceRecord<DatasetKey>[]): PublicSource[] {
  const projected = records.map((record): PublicSource => {
    if (!record.provenance.sourceUrl || !record.provenance.sourcePeriod) throw new Error("Public evidence requires a source URL and period");
    return ({
    organisation: record.provenance.organisation,
    title: record.provenance.publicationTitle,
    url: record.provenance.sourceUrl,
    period: record.provenance.sourcePeriod,
    effectiveFrom: record.provenance.effectiveFrom,
    effectiveTo: record.provenance.effectiveTo,
    classification: record.releaseStatus === "REFERENCE_ONLY" ? "Reference evidence only" : "Published evidence",
  }); });
  return [...new Map(projected.map((source) => [JSON.stringify(source), source])).values()];
}
const evidenceKeys = ["rent", "councilTax", "energyPrice", "energyConsumption", "water", "groceries", "householdSpending", "transport"] as const;
export type CityEvidenceKey = typeof evidenceKeys[number];

// Overrides exist for release-safety tests; supplied payloads must pass the same pinned loader gate.
// Validation errors propagate. An invalid release must never become an empty or fallback budget.
export function buildCityPages(inputs?: Partial<Record<CityEvidenceKey, unknown>>): readonly CityPageModel[] {
  const validated = Object.fromEntries(evidenceKeys.map((key) => [key, validateDataset(key, inputs && key in inputs ? inputs[key] : activeDatasets[key].artifact)]));
  function records<K extends CityEvidenceKey>(key: K): readonly EvidenceRecord<K>[] {
    return validated[key].records as readonly EvidenceRecord<K>[];
  }
  return cityDefinitions.map((city): CityPageModel => {
    const rent = records("rent").filter((r) => r.geography.mvpCityId === city.calculatorCityId);
    const council = records("councilTax").filter((r) => r.geography.mvpCityId === city.calculatorCityId);
    const water = records("water").filter((r) => (city.waterProviders as readonly string[]).includes(r.providerId));
    const transport = records("transport").filter((r) => r.applicability.cityIds.includes(city.calculatorCityId));
    const geography = rent[0]?.geography.official;
    const rentContext = geography ? `${geography.name} (${geography.code}); ${geography.geographyType.replaceAll("_", " ")}.` : "No exact PIPR city row is available for Edinburgh. No other geography is substituted; enter your own rent.";
    const householdSources = sources(records("householdSpending"));
    return {
      city, calculatorHref: "/calculator",
      taxContext: "The calculator supports Scottish tax rates and rUK tax rates. You confirm the applicable taxpayer status yourself; city alone does not determine your legal tax status.",
      coverage: [
        { id: "rent", label: "Rent", state: rent.length ? "Published evidence available" : "Evidence gap", summary: rent.length ? "Published bedroom-based rent evidence; source geography matters." : "No exact published rent row. Your rent is needed.", context: [rentContext, ...(city.slug === "glasgow" ? ["Greater Glasgow is a broad rental market area, not Glasgow City. The council-tax authority is a different geography."] : []), ...(rent.length ? ["The calculator can use supported bedroom-based evidence for the selected source period, or your own rent. July 2026 observations describe the rental stock, not a guaranteed new-tenancy quote. Scottish evidence relies mainly on advertised new lets; local estimates can be volatile."] : [])], sources: sources(rent) },
        { id: "council_tax", label: "Council tax", state: council.length ? "Supported with conditions" : "Evidence gap", summary: council.length ? "Explicit authority and council-tax band required." : "No generic London amount. Borough or authority required.", context: [council.length ? `Published authority: ${council[0].geography.official.name}${council[0].geography.official.code ? ` (${council[0].geography.official.code})` : ""}. Select the applicable authority and actual band; no band is selected as a city default.` : "There is no single source-supported London council-tax amount and no released borough schedule in this slice. Authority selection is required for published evidence; enter your actual amount where that evidence is unavailable.", city.nation === "Scotland" ? "Scottish local authority schedules differ structurally from England. Water and wastewater are separate charges; do not confuse them with council tax or count them twice." : "English published area charges include applicable precepts and use a two-adult basis. Household discounts and eligibility need explicit inputs."], sources: sources(council) },
        { id: "energy", label: "Energy", state: "Requires your amount", summary: "Regional and national evidence cannot infer your household bill.", context: ["Ofgem regional price-cap evidence and NEED consumption reference evidence exist. There is no approved automatic city-to-price-cap-region mapping or household energy model. The calculator asks for your monthly amount.", "NEED profiles are reference material, not city or adult-occupancy observations. Ofgem evidence here covers July–September 2026; it does not establish later-quarter prices."], sources: sources([...records("energyPrice"), ...records("energyConsumption")]) },
        { id: "water", label: "Water", state: city.slug === "birmingham" ? "Requires your amount" : "Supported with conditions", summary: city.nation === "Scotland" ? "Supported unmetered paths need your actual band and services." : "Provider evidence needs billing and service details, or your amount.", context: [city.waterContext, "Provider mapping alone does not establish an official household bill. Use your actual amount where the supported path cannot resolve your circumstances."], sources: sources(water) },
        { id: "groceries", label: "Groceries", state: "Reference evidence only", summary: "Defra Family Food is reference material. Enter your own amount.", context: ["Family Food describes national expenditure evidence, not a city-level personalised household budget. The calculator uses your entered groceries amount. Reference categories may overlap; there is no approved household multiplier."], sources: sources(records("groceries")) },
        ...(["essentials", "lifestyle"] as const).map((id): CityCoverageItem => ({ id, label: id === "essentials" ? "Essentials" : "Lifestyle", state: "Requires your amount", summary: "Your household amount is needed in the current calculator.", context: ["ONS Family Spending is reference-level evidence only. It is not automatically converted into city essentials or lifestyle budgets. Categories can overlap, and no approved category mapping or household model is applied."], sources: householdSources })),
        { id: "transport", label: "Transport", state: "Supported with conditions", summary: "Selected published fare products; enter your personal monthly cost.", context: [`Audited network/product scopes: ${[...new Set(transport.map((r) => r.network))].join("; ")}.`, "Published fare products are evidence, not personal transport budgets. The calculator accepts your explicit monthly household transport cost; fare-product selection is deferred. No product, commute frequency or spending amount is assumed.", "These fare observations were verified on 14 September 2026, with same-day evidence bounds. They do not establish fares for later dates; refresh is required for later-date use. Product, zone, passenger and payment conditions still apply."], sources: sources(transport) },
      ],
    };
  });
}
