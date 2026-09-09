import { describe, expect, it } from "vitest";

import {
  artifactSchema,
  auditArtifactSchema,
  directEvidenceReleaseSchema,
  referenceArtifactSchema,
  transportFareRecordSchema,
  waterTariffRecordSchema,
} from "@/data";

const provenance = {
  sourceId: "SRC-TEST",
  organisation: "Test authority",
  publicationTitle: "Test publication",
  sourceFormat: "HTML",
  retrievedAt: "2026-09-09T00:00:00Z",
  importedAt: "2026-09-09T00:00:00Z",
  snapshotId: "snapshot-test",
  limitations: [],
};

const manifest = {
  releaseId: "ukmr-test-2026.09.0",
  schemaVersion: "1.0.0",
  generatedAt: "2026-09-09T00:00:00Z",
  sourceSnapshotIds: ["snapshot-test"],
  recordCount: 1,
};

const geography = {
  mvpCityId: "LOC-GLA",
  official: { geographyType: "provider area", name: "Greater Glasgow", sourceId: "SRC-TEST" },
};

describe("M1 data contracts", () => {
  it.each(["REFERENCE_ONLY", "DEV_ONLY", "BLOCKED_FROM_RELEASE"])("rejects %s records from direct evidence releases", (releaseStatus) => {
    const record = waterTariffRecordSchema.parse({
      recordId: "WATER-1", dataset: "water", category: "water_tariff", valueType: "OBSERVED_DATA",
      releaseStatus, provenance,
      geography, providerId: "provider", billingRegime: "council_tax_band", serviceComponent: "combined",
      amount: 100, unit: "GBP/year", councilTaxBand: "D",
    });

    expect(directEvidenceReleaseSchema.safeParse({ kind: "DIRECT_EVIDENCE_RELEASE", manifest, records: [record] }).success).toBe(false);
  });

  it("accepts reference-only artifacts separately", () => {
    const record = waterTariffRecordSchema.parse({
      recordId: "WATER-1", dataset: "water", category: "water_tariff", valueType: "OBSERVED_DATA",
      releaseStatus: "REFERENCE_ONLY", provenance,
      geography, providerId: "provider", billingRegime: "council_tax_band", serviceComponent: "combined",
      amount: 100, unit: "GBP/year", councilTaxBand: "D",
    });

    expect(referenceArtifactSchema.safeParse({ kind: "REFERENCE_ARTIFACT", manifest, records: [record] }).success).toBe(true);
  });

  it("keeps USER_ENTERED values out of production artifacts", () => {
    const record = waterTariffRecordSchema.parse({
      recordId: "WATER-1", dataset: "water", category: "water_tariff", valueType: "USER_ENTERED",
      releaseStatus: "RELEASE_READY", provenance,
      geography, providerId: "provider", billingRegime: "council_tax_band", serviceComponent: "combined",
      amount: 100, unit: "GBP/year", councilTaxBand: "D",
    });

    expect(directEvidenceReleaseSchema.safeParse({ kind: "DIRECT_EVIDENCE_RELEASE", manifest, records: [record] }).success).toBe(false);
  });

  it("preserves transport geography without requiring an MVP city", () => {
    const result = transportFareRecordSchema.parse({
      recordId: "FARE-1", dataset: "transport", category: "transport_fare", valueType: "OBSERVED_DATA",
      releaseStatus: "RELEASE_READY", provenance,
      publishedGeography: { official: { geographyType: "operator network", name: "TfL network", sourceId: "SRC-TEST" } },
      authorityOrOperator: "TfL", mode: "bus", productName: "Adult single", fareType: "single",
      fareGbp: 2, passengerType: "adult", effectiveFrom: "2026-01-01",
    });

    expect(result.publishedGeography.mvpCityId).toBeUndefined();
  });
});

const waterRecord = waterTariffRecordSchema.parse({
  recordId: "WATER-1", dataset: "water", category: "water_tariff", valueType: "OBSERVED_DATA",
  releaseStatus: "RELEASE_READY", provenance,
  geography, providerId: "provider", billingRegime: "council_tax_band", serviceComponent: "combined",
  amount: 100, unit: "GBP/year", councilTaxBand: "D",
});

describe.each([
  { kind: "AUDIT", schema: auditArtifactSchema, releaseStatus: "DEV_ONLY" },
  { kind: "DIRECT_EVIDENCE_RELEASE", schema: directEvidenceReleaseSchema, releaseStatus: "RELEASE_READY" },
  { kind: "REFERENCE_ARTIFACT", schema: referenceArtifactSchema, releaseStatus: "REFERENCE_ONLY" },
])("$kind manifest invariants", ({ kind, schema, releaseStatus }) => {
  const records = [
    { ...waterRecord, releaseStatus },
    { ...waterRecord, releaseStatus, recordId: "WATER-2" },
    { ...waterRecord, releaseStatus, recordId: "WATER-3", provenance: { ...provenance, snapshotId: "snapshot-other" } },
  ];
  const artifact = {
    kind,
    manifest: { ...manifest, recordCount: 3, sourceSnapshotIds: ["snapshot-other", "snapshot-test"] },
    records,
  };

  it("accepts a valid artifact with unique snapshot references in any order and no per-record releaseId", () => {
    const parsed = schema.parse(artifact);
    expect(parsed.manifest.releaseId).toBe(manifest.releaseId);
    expect(parsed.records).toHaveLength(3);
    parsed.records.forEach((record) => expect(record).not.toHaveProperty("releaseId"));
    expect(artifactSchema.parse(artifact)).toEqual(parsed);
  });

  it.each([2, 4])("rejects mismatched recordCount %i", (recordCount) => {
    const result = schema.safeParse({ ...artifact, manifest: { ...artifact.manifest, recordCount } });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: ["manifest", "recordCount"] }),
      ]));
    }
  });

  it.each([
    { name: "missing", sourceSnapshotIds: ["snapshot-test"] },
    { name: "extra", sourceSnapshotIds: ["snapshot-test", "snapshot-other", "snapshot-unused"] },
    { name: "wrong with equal count", sourceSnapshotIds: ["snapshot-test", "snapshot-unused"] },
    { name: "duplicate", sourceSnapshotIds: ["snapshot-test", "snapshot-other", "snapshot-test"] },
  ])("rejects $name manifest snapshot IDs", ({ sourceSnapshotIds }) => {
    const result = schema.safeParse({ ...artifact, manifest: { ...artifact.manifest, sourceSnapshotIds } });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: ["manifest", "sourceSnapshotIds"] }),
      ]));
    }
  });
});

it("accepts all four valid audit statuses in one audit artifact", () => {
  const records = ["RELEASE_READY", "DEV_ONLY", "BLOCKED_FROM_RELEASE", "REFERENCE_ONLY"].map((releaseStatus, index) => ({
    ...waterRecord, recordId: `WATER-${index + 1}`, releaseStatus,
  }));
  expect(auditArtifactSchema.parse({ kind: "AUDIT", manifest: { ...manifest, recordCount: 4 }, records }).records).toHaveLength(4);
});

it.each(["RELEASE_READY", "DEV_ONLY", "BLOCKED_FROM_RELEASE"])("rejects %s records from reference artifacts", (releaseStatus) => {
  expect(referenceArtifactSchema.safeParse({
    kind: "REFERENCE_ARTIFACT", manifest, records: [{ ...waterRecord, releaseStatus }],
  }).success).toBe(false);
});

it("rejects USER_ENTERED records from reference artifacts", () => {
  expect(referenceArtifactSchema.safeParse({
    kind: "REFERENCE_ARTIFACT", manifest,
    records: [{ ...waterRecord, releaseStatus: "REFERENCE_ONLY", valueType: "USER_ENTERED" }],
  }).success).toBe(false);
});
