import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildTransportRelease, ingestTransport, transportCityMappings, transportSnapshots, validateTransportArtifact, validateTransportCalculatedArtifact, validateTransportCoverage } from "../../src/data/ingestion/transport/release";
import { transportExtracts } from "../../src/data/ingestion/transport/sources";
import { transportIdentity } from "../../src/data/ingestion/transport/adapters";
import { transportMonthlyEquivalent } from "../../src/data/ingestion/transport/conversions";
import { transportUsageProfiles, transportUsageProfileSchema } from "../../src/data/ingestion/transport/profiles";
import { transportFareRecordSchema, transportPeriodConversionRecordSchema } from "../../src/data/schemas/records";
import { directEvidenceReleaseSchema } from "../../src/data/schemas/artifacts";

const built = buildTransportRelease();
const fares = built.release!.records.map((r) => transportFareRecordSchema.parse(r));
const first = fares[0];
const find = (part: string) => fares.find((r) => r.recordId.includes(part))!;
const replace = (value: unknown) => [value, ...fares.slice(1)];

describe("transport selected product evidence", () => {
  it("reconciles all reviewed rows and preserves observed classification", () => {
    expect(built.status).toBe("SUCCESS"); expect(fares).toHaveLength(25); expect(built.runs).toHaveLength(15);
    expect(built.runs.reduce((sum, r) => sum + r.counts.acceptedRows, 0)).toBe(25);
    for (const r of built.runs) {
      expect(r.status).toBe("SUCCESS"); expect(r.counts.rejectedRows).toBe(0);
      expect(r.counts.inputRows).toBe(r.rows.length); expect(r.counts.inputRows).toBe(r.counts.acceptedRows + r.counts.rejectedRows);
    }
    for (const r of fares) expect(r).toMatchObject({ valueType: "OBSERVED_DATA", releaseStatus: "RELEASE_READY", applicability: { cityDefault: false } });
  });
  it.each(transportExtracts.map((e) => [e.key, e] as const))("preserves reviewed provenance for %s", (_, e) => {
    for (const r of ingestTransport(e).run.records) {
      expect(r.provenance.sourceUrl).toBe(e.snapshot.sourceUrl);
      expect(r.provenance.snapshotId).toBe(e.snapshot.snapshotId);
      expect(r.provenance.organisation).toBe(e.organisation);
      expect(r.provenance.snapshotChecksum).toBe("checksum" in e.snapshot ? e.snapshot.checksum : undefined);
      expect(r.qa.supportingEvidence).toEqual(e.supportingEvidence);
      expect(r.fareGbp).toBe(Number(r.qa.rawAmount));
    }
  });
  it.each([0, -1, NaN, Infinity, "5", undefined])("rejects invalid fare amount %s", (fareGbp) => {
    expect(transportFareRecordSchema.safeParse({ ...first, fareGbp }).success).toBe(false);
  });
  it.each([
    { operator: "" }, { network: "" }, { zonesOrArea: "" }, { paymentMethod: "" }, { productName: "" },
    { validity: "" }, { includedModes: [] }, { mode: "multimodal", includedModes: ["bus"] },
    { mode: "bus", includedModes: ["rail"] }, { includedModes: ["bus", "bus"] },
    { fareType: "weekly", validityPeriod: "day" }, { fareType: "daily_cap", fareUnit: "GBP/ticket" },
    { fareType: "annual", validityPeriod: "week" }, { valueType: "CALCULATED" }, { valueType: "MODELLED_ESTIMATE" },
    { releaseStatus: "DEV_ONLY" }, { releaseStatus: "REFERENCE_ONLY" },
    { effectiveFrom: "2026-09-15" }, { effectiveTo: "2026-09-13" }, { effectiveTo: undefined },
    { effectiveTo: "2027-09-14" }, { verifiedAsOf: "2026-09-13" }, { effectiveFrom: "not-a-date" },
    { applicability: { ...first.applicability, cityDefault: true } },
    { publishedGeography: { ...first.publishedGeography, mvpCityId: "LOC-BIR" } }, { bestFare: true },
  ])("rejects incompatible normalized semantics %j", (patch) => {
    expect(transportFareRecordSchema.safeParse({ ...first, ...patch }).success).toBe(false);
    expect(validateTransportCoverage(replace({ ...first, ...patch })).status).toBe("FAILED");
  });
  it.each([{ fareGbp: 999 }, { operator: "Another operator" }, { network: "Universal city" }, { zonesOrArea: "All UK" }, { productName: "Cheapest city fare" }, { validity: "All future years" }, { passengerType: "child" }])("rejects plausible but unreviewed substitutions %j", (patch) => {
    expect(validateTransportCoverage(replace({ ...first, ...patch })).status).toBe("FAILED");
  });
  it("rejects duplicate product identity independently of record ID", () => {
    const dupe = { ...first, recordId: "different-id" };
    expect(transportIdentity(dupe)).toBe(transportIdentity(first));
    expect(validateTransportCoverage([...fares, dupe]).diagnostics.map((d) => d.code)).toContain("DUPLICATE_TRANSPORT_PRODUCT_IDENTITY");
  });
  it("accounts for duplicate source rows as rejections", () => {
    const e = structuredClone(transportExtracts[0]); e.rows.push(e.rows[0]);
    const run = ingestTransport(e).run;
    expect(run.status).toBe("FAILED"); expect(run.counts.rejectedRows).toBe(2);
    expect(run.counts.inputRows).toBe(run.counts.acceptedRows + run.counts.rejectedRows);
  });
  it("rejects altered raw fare facts without accepting a fallback", () => {
    const e = structuredClone(transportExtracts[0]); e.rows[0].rawAmount = "123";
    const run = ingestTransport(e).run;
    expect(run.counts.rejectedRows).toBe(1); expect(run.diagnostics.map((d) => d.code)).toContain("SOURCE_REVIEW_REQUIRED");
    expect(buildTransportRelease([e, ...transportExtracts.slice(1)]).release).toBeUndefined();
  });
  it("fails missing extracts and missing products", () => {
    expect(buildTransportRelease(transportExtracts.slice(1)).status).toBe("FAILED");
    expect(validateTransportCoverage(fares.slice(1)).status).toBe("FAILED");
  });
  it("rejects changed snapshot metadata and incomplete registries", () => {
    const e = structuredClone(transportExtracts[0]); e.snapshot.sourceUrl = "https://example.com/unverified";
    expect(() => ingestTransport(e)).toThrow();
    expect(() => validateTransportArtifact(built.release, transportSnapshots.slice(1))).toThrow();
    const snapshots = structuredClone(transportSnapshots); snapshots[0].checksum = "fabricated";
    expect(() => validateTransportArtifact(built.release, snapshots)).toThrow();
  });
  it("does not fabricate original checksums for browser-only reviews", () => {
    expect(transportSnapshots.filter((s) => s.checksum)).toHaveLength(8);
    expect(transportSnapshots.every((s) => s.retention === "METADATA_ONLY")).toBe(true);
  });
  it("retains source date limitations and change notices without inventing fare intervals", () => {
    for (const r of fares) expect(r).toMatchObject({ effectiveDateBasis: "VERIFIED_CURRENT_AS_OF", effectiveFrom: "2026-09-14", effectiveTo: "2026-09-14", verifiedAsOf: "2026-09-14" });
    expect(find(":bristolcurrent:").provenance.limitations.join(" ")).toContain("4 January");
    expect(find(":subwaycurrent:").qa.supportingEvidence).toEqual(expect.arrayContaining([expect.objectContaining({ publishedEffectiveFrom: "2026-01-05", publicationDate: "2025-12-19" })]));
  });
});

describe("transport city applicability", () => {
  it.each([["LOC-LON", 5], ["LOC-BIR", 2], ["LOC-MAN", 3], ["LOC-LEE", 2], ["LOC-LIV", 4], ["LOC-BRS", 2], ["LOC-EDI", 4], ["LOC-GLA", 3]])("reports selected evidence and unresolved default for %s", (id, count) => {
    const c = built.coverage.cityCoverage.find((c) => c.cityId === id)!;
    expect(c.products).toHaveLength(count as number); expect(c.evidenceStatus).toBe("COMPLETE_FOR_SELECTED_PRODUCTS");
    expect(c.cityDefault).toBe("UNRESOLVED"); expect(c.diagnostics[0].code).toBe("TRANSPORT_CITY_DEFAULT_PRODUCT_UNRESOLVED");
  });
  it("rejects unsupported Birmingham default or network mappings", () => {
    const mappings = structuredClone(transportCityMappings); mappings[1].products[0].network = "Birmingham universal";
    expect(validateTransportCoverage(fares, mappings).status).toBe("FAILED");
    expect(validateTransportCoverage(fares, transportCityMappings.map((m) => ({ ...m, cityDefault: "RESOLVED" }))).status).toBe("FAILED");
  });
  it("preserves bus-only, multimodal, zone and operator identity", () => {
    expect(find(":tfwmbus:")).toMatchObject({ mode: "bus", includedModes: ["bus"], operator: "Participating nbus operators" });
    expect(find(":tfwmnetwork:")).toMatchObject({ mode: "multimodal", includedModes: ["bus", "tram", "rail"] });
    expect(find(":tfwmnetwork:").zonesOrArea).toContain("1-5");
    expect(find(":mcard:bus-week:")).toMatchObject({ network: "MCard", validityPeriod: "week", fareGbp: 26 });
    expect(find(":bee:bus-tram-week:").includedModes).toEqual(["bus", "tram"]);
  });
  it("does not collapse Liverpool product families or ferry/rail restrictions", () => {
    const rows = fares.filter((r) => r.applicability.cityIds.includes("LOC-LIV"));
    expect(new Set(rows.map((r) => r.network)).size).toBe(4);
    expect(find(":solo:").includedModes).toEqual(["bus"]); expect(find(":railpass:").includedModes).toEqual(["rail"]);
    expect(find(":trio:").includedModes).toEqual(["bus", "rail", "ferry"]);
    expect(find(":saveaway:")).toMatchObject({ peakStatus: "off_peak", validityPeriod: "day" });
    expect(find(":saveaway:").applicability.conditions.join(" ")).toContain("06:31–09:29");
  });
  it("preserves Edinburgh bus/tram/airport products", () => {
    expect(find(":lothiancurrent:single:").mode).toBe("bus");
    expect(find(":lothiancurrent:city-day:").includedModes).toEqual(["bus", "tram"]);
    expect(find(":tramscurrent:city-single:")).toMatchObject({ mode: "tram", airportApplicability: "not_included", fareGbp: 2.4 });
    expect(find(":tramscurrent:airport-single:")).toMatchObject({ mode: "tram", airportApplicability: "included", fareGbp: 7.9 });
  });
  it("preserves Glasgow Subway, First and ZoneCard separately", () => {
    expect(find(":subwaycurrent:").mode).toBe("subway");
    expect(find(":firstglasgow:")).toMatchObject({ operator: "First Glasgow", mode: "bus", fareGbp: 6.6 });
    expect(find(":zonecard:")).toMatchObject({ network: "ZoneCard", includedModes: ["bus", "rail", "subway"], fareGbp: 31 });
    expect(find(":zonecard:").zonesOrArea).toContain("not all Glasgow");
  });
  it("distinguishes a PAYG cap from the same-priced season ticket", () => {
    const cap = find(":tfl:weekly-cap:"); const pass = find(":tfl:seven-day:");
    expect(cap.fareGbp).toBe(pass.fareGbp); expect(transportIdentity(cap)).not.toBe(transportIdentity(pass));
    expect(cap.validityPeriod).toBe("monday_sunday"); expect(pass.validityPeriod).toBe("week");
    expect(find(":bristolcurrent:week-cap:").validityPeriod).toBe("rolling_week");
  });
});

describe("transport calculated equivalents and behavioural fixtures", () => {
  it("emits only linked weekly/annual ticket equivalents with no rounding", () => {
    expect(built.calculated!.records).toHaveLength(8);
    for (const raw of built.calculated!.records) {
      const r = transportPeriodConversionRecordSchema.parse(raw); const p = fares.find((p) => p.recordId === r.observedRecordId)!;
      expect(r.valueType).toBe("CALCULATED"); expect(r.releaseStatus).toBe("REFERENCE_ONLY");
      expect(r.observedFareGbp).toBe(p.fareGbp); expect(r.provenance.snapshotId).toBe(p.provenance.snapshotId);
      expect(r.monthlyGbp).toBe(p.fareType === "weekly" ? p.fareGbp * 52 / 12 : p.fareGbp / 12);
    }
    expect(transportMonthlyEquivalent(find(":tfl:annual:")).monthlyGbp).toBe(988 / 12);
    expect(transportMonthlyEquivalent(find(":tfl:seven-day:")).monthlyGbp).toBe(24.7 * 52 / 12);
  });
  it.each([":tfl:daily:", ":tfl:weekly-cap:", ":bristolcurrent:week-cap:", ":tramscurrent:city-single:"])("does not annualize caps or singles %s", (id) => {
    expect(() => transportMonthlyEquivalent(find(id))).toThrow();
  });
  it("rejects altered derivatives, parent links and observed mislabelling", () => {
    const c = structuredClone(built.calculated!);
    const first = transportPeriodConversionRecordSchema.parse(c.records[0]);
    expect(transportPeriodConversionRecordSchema.safeParse({ ...first, valueType: "OBSERVED_DATA" }).success).toBe(false);
    expect(transportPeriodConversionRecordSchema.safeParse({ ...first, monthlyGbp: 100 }).success).toBe(false);
    c.records[0] = { ...first, observedRecordId: "wrong-parent" };
    expect(() => validateTransportCalculatedArtifact(c, fares)).toThrow();
    expect(() => validateTransportCalculatedArtifact(built.calculated, fares.slice(1))).toThrow();
  });
  it("preserves the four DEV_ONLY assumptions without choosing products or journey counts", () => {
    expect(transportUsageProfiles.map((p) => p.daysPerWeek)).toEqual([1.5, 3, 5, 6.5]);
    for (const p of transportUsageProfiles) {
      expect(p).toMatchObject({ valueType: "MODELLED_ESTIMATE", releaseStatus: "DEV_ONLY" });
      expect(transportUsageProfileSchema.safeParse({ ...p, releaseStatus: "RELEASE_READY" }).success).toBe(false);
      expect(transportUsageProfileSchema.safeParse({ ...p, fareGbp: 20 }).success).toBe(false);
      expect(transportFareRecordSchema.safeParse({ ...first, ...p }).success).toBe(false);
    }
  });
  it("keeps calculated and modelled rows out of the direct release", () => {
    for (const row of [...built.calculated!.records, ...transportUsageProfiles]) {
      const artifact = { ...built.release, records: [row], manifest: { ...built.release!.manifest, recordCount: 1 } };
      expect(directEvidenceReleaseSchema.safeParse(artifact).success).toBe(false);
      expect(() => validateTransportArtifact(artifact)).toThrow();
    }
  });
});

describe("transport deterministic artifacts", () => {
  it("rebuilds byte-for-byte including reports, independent of input order", () => {
    expect(JSON.stringify(buildTransportRelease())).toBe(JSON.stringify(built));
    expect(buildTransportRelease([...transportExtracts].reverse()).release).toEqual(built.release);
    const report = { status: built.status, imports: built.imports, runs: built.runs, coverage: built.coverage, validationDiagnostics: built.validationDiagnostics };
    for (const [file, value] of Object.entries({ "audit.json": built.audit, "release.json": built.release, "calculated.json": built.calculated, "ingestion-report.json": report })) {
      expect(readFileSync(`src/data/generated/2026-09-v1/transport/${file}`, "utf8")).toBe(`${JSON.stringify(value, null, 2)}\n`);
    }
  });
});
