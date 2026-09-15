import { z } from "zod";
import { mvpCityIdSchema, jurisdictionSchema } from "../../data/schemas/enums";
import type { EvidenceLoader, EvidenceRecord } from "../loaders";
import { yearMonthSchema } from "../loaders";
import { fromGbp } from "../money";
import { monthlyOverrideSchema, bedroomSchema, authoritySelectionSchema, propertyTypeSchema, type MonthlyOverride } from "../contracts/input";
import type { EvidenceResolution, EngineEvidence, BaselineEvidence } from "../contracts/output";
import type { Category, Diagnostic, DiagnosticCode } from "../diagnostics";

export const noFallbackPolicy = Object.freeze({ precedence: ["VALID_USER_OVERRIDE", "EXACT_SUPPORTED_EVIDENCE", "UNRESOLVED"] as const, geographicFallback: false, numericFallback: false });
const bedroomBands = { 1: "one bed", 2: "two bed", 3: "three bed", 4: "four or more bed" } as const;
const rentRequestSchema = z.strictObject({ cityId: mvpCityIdSchema, bedrooms: bedroomSchema, sourcePeriod: yearMonthSchema, propertyType: propertyTypeSchema.optional(), override: monthlyOverrideSchema.optional() });
const councilRequestSchema = z.strictObject({ cityId: mvpCityIdSchema, effectiveOn: z.iso.date(), selection: authoritySelectionSchema.optional(), override: monthlyOverrideSchema.optional() });
export type RentRequest = z.infer<typeof rentRequestSchema>;
export type CouncilTaxRequest = z.infer<typeof councilRequestSchema>;
function resolve<T extends EngineEvidence>(category: Category, cityId: z.infer<typeof mvpCityIdSchema>, records: readonly T[], code: DiagnosticCode, message: string, override?: MonthlyOverride, candidates: string[] = []): EvidenceResolution<T> {
  const diagnostic: Diagnostic = { code, category, cityId, severity: "blocking", kind: code === "EVIDENCE_PERIOD_UNSUPPORTED" ? "source_age" : "evidence_gap", message };
  const baselineEvidence: BaselineEvidence<T> = records.length ? { status: "AVAILABLE", records } : { status: "UNAVAILABLE", records: [], diagnostics: [diagnostic] };
  const limitations = [...new Set(records.flatMap((r) => [...r.provenance.limitations, ...(r.provenance.methodologyNotes ? [r.provenance.methodologyNotes] : [])]))];
  if (override) return { status: "USER_OVERRIDE", category, cityId, baselineEvidence, effectiveInput: { valueType: "USER_ENTERED", amount: fromGbp(override.amountGbp), period: "MONTHLY", note: override.note }, limitations: [...limitations, "User monthly amount replaces the effective input; baseline evidence and its gaps remain visible."], diagnostics: [...(records.length ? [] : [{ ...diagnostic, severity: "warning" as const }]), { code: "USER_OVERRIDE_APPLIED", category, cityId, severity: "info", kind: "user_override", message: "Used the explicitly entered monthly amount; baseline evidence was not changed." }] };
  if (!records.length) return { status: "UNRESOLVED", category, cityId, baselineEvidence, diagnostics: [diagnostic], limitations: [message], canResolveWithUserInput: ["rent", "council_tax"].includes(category), sourceCandidates: candidates };
  return { status: "RESOLVED", category, cityId, baselineEvidence, effectiveInput: { valueType: "OBSERVED_DATA", records }, diagnostics: [], limitations };
}
/** Contract-invalid requests throw ZodError; valid but unsupported evidence returns UNRESOLVED. */
export function resolveRent(loader: EvidenceLoader, request: RentRequest): EvidenceResolution<EvidenceRecord<"rent">> {
  const q = rentRequestSchema.parse(request);
  const records = q.propertyType ? [] : loader.getRentEvidence({ cityId: q.cityId, bedroomBand: bedroomBands[q.bedrooms], sourcePeriod: q.sourcePeriod });
  const activeMonth = loader.metadata.datasets.find((d) => d.dataset === "rent")!.sourcePeriod;
  const code = q.cityId === "LOC-EDI" ? "EDINBURGH_RENT_SOURCE_UNRESOLVED" : q.propertyType ? "RENT_PROPERTY_CROSS_UNSUPPORTED" : q.sourcePeriod !== activeMonth ? "EVIDENCE_PERIOD_UNSUPPORTED" : "NO_EXACT_EVIDENCE";
  return resolve("rent", q.cityId, records.length === 1 ? records : [], code, q.cityId === "LOC-EDI" ? "No Edinburgh rent source is approved; no Scotland average or other area is substituted." : q.propertyType ? "Bedroom × property-type cross-tabs are not observed; no nearby measure is substituted." : `No exact city/bedroom/source-month evidence. The pinned source month is ${activeMonth}.`, q.override, ["SRC-001"]);
}
export function resolveCouncilTax(loader: EvidenceLoader, request: CouncilTaxRequest): EvidenceResolution<EvidenceRecord<"councilTax">> {
  const q = councilRequestSchema.parse(request);
  const records = q.selection ? loader.getCouncilTaxEvidence({ cityId: q.cityId, effectiveOn: q.effectiveOn, ...q.selection }) : [];
  const code = !q.selection ? q.cityId === "LOC-LON" ? "LONDON_CITY_DEFAULT_UNRESOLVED" : "AUTHORITY_SELECTION_REQUIRED" : "NO_EXACT_EVIDENCE";
  return resolve("council_tax", q.cityId, records.length === 1 ? records : [], code, !q.selection ? "An explicit supported authority and band are required; no city scalar or borough is selected." : "No exact supported city/authority/band/effective-date match. No authority or year substitution.", q.override, ["SRC-002", "SRC-020"]);
}
const taxRequestSchema = z.strictObject({ cityId: mvpCityIdSchema, jurisdiction: jurisdictionSchema.optional(), taxYear: z.string().regex(/^\d{4}\/\d{2}$/) });
export function resolveTaxReference(loader: EvidenceLoader, request: z.infer<typeof taxRequestSchema>): EvidenceResolution<EvidenceRecord<"incomeTax">> {
  const q = taxRequestSchema.parse(request);
  return resolve("income_tax", q.cityId, q.jurisdiction ? loader.getTaxReference({ jurisdiction: q.jurisdiction, taxYear: q.taxYear }) : [], q.jurisdiction ? "EVIDENCE_PERIOD_UNSUPPORTED" : "TAX_JURISDICTION_REQUIRED", "Explicit tax jurisdiction and supported tax year required; a city label does not establish tax residency.");
}
const niRequestSchema = z.strictObject({ cityId: mvpCityIdSchema, taxYear: z.string().regex(/^\d{4}\/\d{2}$/), categoryLetter: z.string().regex(/^[A-Z]$/), payPeriod: z.enum(["weekly", "monthly", "annual"]) });
export function resolveNiReference(loader: EvidenceLoader, request: z.infer<typeof niRequestSchema>): EvidenceResolution<EvidenceRecord<"nationalInsurance">> {
  const q = niRequestSchema.parse(request);
  return resolve("national_insurance", q.cityId, loader.getNiReference(q), "NI_SCOPE_UNSUPPORTED", "Only the pinned 2026/27 employee Class 1 category A tables are available; no category or pay-period substitution.");
}
