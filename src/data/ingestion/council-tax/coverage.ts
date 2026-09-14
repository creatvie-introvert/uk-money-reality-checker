import { councilTaxBandSchema, councilTaxRecordSchema } from "../../schemas/records";
import { councilTaxAuthorities } from "./authorities";

export interface CouncilTaxDiagnostic {
  code: "INVALID_COUNCIL_TAX_RECORD" | "MISSING_AUTHORITY_BAND" | "DUPLICATE_AUTHORITY_BAND" | "LONDON_CITY_DEFAULT_UNRESOLVED";
  dimension: string;
  message: string;
}

/** Seven-authority release coverage is distinct from eight-city product coverage. */
export function validateCouncilTaxCoverage(records: readonly unknown[]) {
  const diagnostics: CouncilTaxDiagnostic[] = [];
  const counts = new Map<string, number>();
  const ids = new Set<string>();
  for (const [index, raw] of records.entries()) {
    const parsed = councilTaxRecordSchema.safeParse(raw);
    if (!parsed.success) {
      diagnostics.push({ code: "INVALID_COUNCIL_TAX_RECORD", dimension: `record:${index}`, message: parsed.error.message });
      continue;
    }
    const r = parsed.data;
    const key = `${r.nation}:${r.geography.official.name}:${r.band}:${r.taxYear}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    const a = councilTaxAuthorities.find((a) => a.name === r.geography.official.name && a.nation === r.nation);
    const p = r.provenance;
    if (!a || a.code !== r.geography.official.code || a.cityId !== r.geography.mvpCityId ||
        a.sourceId !== r.geography.official.sourceId || r.geography.official.geographyType !== "local_authority" ||
        p.sourceId !== a.sourceId || p.sourceFormat !== (a.nation === "England" ? "ODS" : "XLSX") ||
        !p.sourceUrl || !p.snapshotChecksum || !p.methodologyNotes ||
        r.taxYear !== "2026/27" || r.effectiveFrom !== "2026-04-01" || r.effectiveTo !== "2027-03-31" ||
        p.sourcePeriod !== r.taxYear || p.effectiveFrom !== r.effectiveFrom || p.effectiveTo !== r.effectiveTo ||
        r.releaseStatus !== "RELEASE_READY" || r.valueType !== "OBSERVED_DATA" || ids.has(r.recordId)) {
      diagnostics.push({ code: "INVALID_COUNCIL_TAX_RECORD", dimension: key, message: "Required reviewed authority identity, source regime/provenance, 2026/27 effective period, unique record ID, OBSERVED_DATA and RELEASE_READY" });
    }
    ids.add(r.recordId);
  }
  for (const a of councilTaxAuthorities) {
    for (const band of councilTaxBandSchema.options) {
      const key = `${a.nation}:${a.name}:${band}:2026/27`;
      const count = counts.get(key) ?? 0;
      if (count !== 1) diagnostics.push({
        code: count === 0 ? "MISSING_AUTHORITY_BAND" : "DUPLICATE_AUTHORITY_BAND",
        dimension: key, message: `Required exactly one authority/band/year charge; found ${count}`,
      });
    }
  }
  return {
    releaseScope: "SEVEN_REVIEWED_AUTHORITIES" as const,
    status: diagnostics.length ? "FAILED" as const : "COMPLETE" as const,
    diagnostics,
    // This cannot become complete through presence of a borough row.
    cityDefaultCoverage: {
      status: "INCOMPLETE" as const,
      diagnostics: [{ code: "LONDON_CITY_DEFAULT_UNRESOLVED", dimension: "LOC-LON", message: "No approved borough-selection methodology or single London council-tax default. No borough, average or other authority is substituted." }] satisfies CouncilTaxDiagnostic[],
    },
  };
}
