import { z } from "zod";
import { artifactSchema } from "../../data/schemas/artifacts";
import type { AuditRecord } from "../../data/schemas/records";
import type { MvpCityId, Jurisdiction } from "../../data/schemas/enums";
import type { Diagnostic } from "../diagnostics";
import { activeDatasets, engineDatasetVersion, type DatasetKey } from "./datasets";

export type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
type DatasetCategory<K extends DatasetKey> = typeof activeDatasets[K]["category"];
export type EvidenceRecord<K extends DatasetKey> = DeepReadonly<Extract<AuditRecord, { category: DatasetCategory<K> }>>;
function freeze<T>(value: T): DeepReadonly<T> {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}
// Key ordering is immaterial; array ordering and every raw field remain pinned.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a],[b]) => a.localeCompare(b,"en")).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
export class EvidenceLoadError extends Error {
  constructor(public readonly diagnostic: Diagnostic) { super(diagnostic.message); this.name = "EvidenceLoadError"; }
}
export function validateDataset<K extends DatasetKey>(key: K, raw: unknown) {
  const config = activeDatasets[key];
  if (!config) throw new EvidenceLoadError({ code: "INCOMPATIBLE_DATA_RELEASE", severity: "blocking", kind: "validation", message: `Unknown dataset: ${key}` });
  let detached: unknown;
  try { detached = structuredClone(raw); }
  catch { throw new EvidenceLoadError({ code: "INVALID_ARTIFACT", severity: "blocking", kind: "validation", message: `${key}: expected a cloneable generated payload` }); }
  const parsed = artifactSchema.safeParse(detached);
  if (!parsed.success) throw new EvidenceLoadError({ code: "INVALID_ARTIFACT", severity: "blocking", kind: "validation", message: `${key}: ${parsed.error.message}` });
  const a = parsed.data;
  if (a.kind !== config.kind || a.manifest.releaseId !== config.releaseId || a.manifest.schemaVersion !== config.schemaVersion || a.records.length !== config.recordCount || a.records.some((r) => r.category !== config.category || r.valueType !== "OBSERVED_DATA")) {
    throw new EvidenceLoadError({ code: "INCOMPATIBLE_DATA_RELEASE", severity: "blocking", kind: "validation", message: `${key}: unsupported kind, release, schema, category, count or classification` });
  }
  // Existing M1 production gates import controlled sources. Do not pull those into runtime.
  // Instead accept only the complete audited generated payload pinned by this build.
  if (canonical(raw) !== canonical(config.artifact)) throw new EvidenceLoadError({ code: "INVALID_ARTIFACT", severity: "blocking", kind: "validation", message: `${key}: payload differs from the pinned generated evidence` });
  return freeze(a);
}
export function createEvidenceLoader(inputs?: Readonly<Record<DatasetKey, unknown>>) {
  const datasets = Object.fromEntries((Object.keys(activeDatasets) as DatasetKey[]).map((key) => [key, validateDataset(key, inputs ? inputs[key] : activeDatasets[key].artifact)]));
  function records<K extends DatasetKey>(key: K): readonly EvidenceRecord<K>[] {
    return datasets[key].records as readonly EvidenceRecord<K>[];
  }
  const metadata = freeze({ version: engineDatasetVersion, datasets: (Object.keys(activeDatasets) as DatasetKey[]).map((key) => ({ dataset: key, ...datasets[key].manifest, kind: datasets[key].kind, sourcePeriod: activeDatasets[key].sourcePeriod })) });
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
export type EvidenceLoader = ReturnType<typeof createEvidenceLoader>;
export type DataReleaseMetadata = EvidenceLoader["metadata"];
export const yearMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
