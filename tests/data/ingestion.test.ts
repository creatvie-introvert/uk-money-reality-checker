import { describe, expect, it } from "vitest";

import {
  incomeTaxRuleRecordSchema, releaseStatusSchema, runIngestion,
  snapshotMetadataSchema, sourceCatalogEntrySchema, sourceCatalogSchema, sourceCatalog,
  type ImportedPayload,
} from "@/data";
import { taxReferenceAdapter, taxReferenceRow } from "./fixtures/tax-reference";

const source = sourceCatalogEntrySchema.parse({
  sourceId: "TEST-TAX", category: "income_tax", organisation: "Test publisher",
  publicationTitle: "Synthetic tax reference fixture", authority: "PRIMARY",
  accessMechanisms: ["JSON"], sourceStatus: "POPULATED", rawSnapshotPolicy: "RETAIN",
});
const input: ImportedPayload = {
  snapshot: {
    retention: "RETAINED", snapshotId: "test-snapshot", sourceId: source.sourceId,
    localReference: "/external-fixtures/tax.json", checksum: "test-checksum",
    retrievedAt: "2026-09-09T00:00:00Z", sourceFormat: "JSON",
  },
  importedAt: "2026-09-09T01:00:00Z", importVersion: "test-import-1",
  releaseStatus: "DEV_ONLY", payload: JSON.stringify([taxReferenceRow]),
};

describe("source catalogue", () => {
  it("validates catalogue entries and rejects duplicate source IDs", () => {
    expect(sourceCatalogSchema.parse(sourceCatalog)).toEqual(sourceCatalog);
    expect(sourceCatalogSchema.safeParse([source, source]).success).toBe(false);
  });

  it("preserves unresolved metadata without inventing access, dates or licences", () => {
    const unresolved = sourceCatalogEntrySchema.parse({
      ...source, accessMechanisms: undefined, sourceStatus: undefined,
      unresolvedMetadata: ["Access and governance review pending"], rawSnapshotPolicy: "PENDING_REVIEW",
    });
    expect(unresolved.accessMechanisms).toBeUndefined();
    expect(unresolved.sourceStatus).toBeUndefined();
    expect(unresolved.publicationDate).toBeUndefined();
    expect(unresolved.licenceReference).toBeUndefined();
    expect(sourceCatalogEntrySchema.safeParse({ ...unresolved, unresolvedMetadata: [] }).success).toBe(false);
  });

  it("keeps source governance concepts separate from release status", () => {
    for (const sourceStatus of ["POPULATED", "MODELLED", "POPULATED_DEV", "CONFLICT_REVIEW", "POPULATED_PARTIAL"]) {
      expect(sourceCatalogEntrySchema.safeParse({ ...source, sourceStatus }).success).toBe(true);
      expect(releaseStatusSchema.safeParse(sourceStatus).success).toBe(false);
    }
  });

  it("preserves audited reference, suitability and effective dates independently of governance", () => {
    const entry = sourceCatalogEntrySchema.parse({
      ...source, sourceReference: "Batch 4 — income tax", suitability: "REFERENCE_INPUT",
      effectiveFrom: "2026-04-06", effectiveTo: "2027-04-05",
    });
    expect(entry).toMatchObject({
      sourceReference: "Batch 4 — income tax", suitability: "REFERENCE_INPUT",
      sourceStatus: "POPULATED", effectiveFrom: "2026-04-06", effectiveTo: "2027-04-05",
    });
    expect(releaseStatusSchema.safeParse(entry.suitability).success).toBe(false);
    expect(sourceCatalogEntrySchema.safeParse({ ...entry, effectiveTo: "2026-04-05" }).success).toBe(false);
  });

  it("does not infer category APIs or provider reuse permission from general platforms", () => {
    const ofgem = sourceCatalog.find((entry) => entry.sourceId === "SRC-OFGEM-REGIONAL")!;
    const tfl = sourceCatalog.find((entry) => entry.sourceId === "SRC-TFL")!;
    expect(ofgem.accessMechanisms).toEqual(["HTML"]);
    expect(tfl.accessMechanisms).toEqual(["HTML"]);
    expect(tfl.suitability).toBe("PRIMARY_CONTROLLED_IMPORT");
    for (const entry of sourceCatalog.filter((entry) => ["water", "transport", "energy_price"].includes(entry.category))) {
      expect(entry.accessMechanisms ?? []).not.toContain("API");
      if (entry.sourceId === "SRC-OFGEM-REGIONAL" || ["water", "transport"].includes(entry.category)) {
        expect(entry.licenceReference).toContain("UNRESOLVED");
        expect(entry.rawSnapshotPolicy).toBe("METADATA_ONLY");
      } else {
        expect(entry.licenceReference).toBeUndefined();
        expect(entry.rawSnapshotPolicy).toBe("PENDING_REVIEW");
      }
    }
  });

  it("keeps corrected source identities and observed COICOP classification", () => {
    expect(sourceCatalog.find((entry) => entry.sourceId === "SRC-006")).toMatchObject({
      category: "coicop_expenditure", suitability: "OBSERVED_SOURCE_INPUT", sourcePeriod: "FYE 2025",
    });
    const ni = sourceCatalog.find((entry) => entry.sourceId === "SRC-012")!;
    expect(ni.publicationTitle).toBe("Rates and thresholds for employers 2026/27");
    expect(ni.accessMechanisms).toEqual(["HTML"]);
    expect(ni.sourceUrl).toBe("https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027");
    expect(ni.sourceReference).toContain("Batch 4");
  });
});

describe("snapshot metadata", () => {
  it("accepts retained files outside Git and requires a checksum and local reference", () => {
    expect(snapshotMetadataSchema.safeParse(input.snapshot).success).toBe(true);
    expect(snapshotMetadataSchema.safeParse({ ...input.snapshot, checksum: undefined }).success).toBe(false);
    expect(snapshotMetadataSchema.safeParse({ ...input.snapshot, localReference: undefined }).success).toBe(false);
  });

  it("accepts metadata-only references without a checksum but requires a reason and source locator", () => {
    const snapshot = {
      snapshotId: "metadata-snapshot", sourceId: source.sourceId, sourceFormat: "JSON",
      retrievedAt: input.snapshot.retrievedAt, retention: "METADATA_ONLY",
      sourceReference: "Provider publication reference", nonRetentionReason: "Raw content retention not authorized",
    };
    expect(snapshotMetadataSchema.safeParse(snapshot).success).toBe(true);
    expect(snapshotMetadataSchema.safeParse({ ...snapshot, sourceReference: undefined, sourceUrl: "https://example.org/source" }).success).toBe(true);
    expect(snapshotMetadataSchema.safeParse({ ...snapshot, nonRetentionReason: undefined }).success).toBe(false);
    expect(snapshotMetadataSchema.safeParse({ ...snapshot, sourceReference: undefined }).success).toBe(false);
  });
});

describe("offline ingestion", () => {
  it("normalizes a raw payload to canonical typed records with counts and provenance", () => {
    const result = runIngestion(taxReferenceAdapter, source, input);
    expect(result.status).toBe("SUCCESS");
    expect(result.counts).toEqual({ inputRows: 1, acceptedRows: 1, rejectedRows: 0 });
    expect(result.records[0].threshold).toBe(100);
    expect(incomeTaxRuleRecordSchema.parse(result.records[0])).toEqual(result.records[0]);
    expect(result.records[0].provenance.snapshotId).toBe(input.snapshot.snapshotId);
    expect(result.diagnostics).toEqual([]);
  });

  it.each(["{broken", "{}"])("reports a payload parse failure for %s", (payload) => {
    const result = runIngestion(taxReferenceAdapter, source, { ...input, payload });
    expect(result.status).toBe("FAILED");
    expect(result.counts.inputRows).toBeNull();
    expect(result.diagnostics[0].code).toBe("SOURCE_PARSE_FAILURE");
  });

  it("normalizes metadata-only inputs without inventing a checksum", () => {
    const result = runIngestion(taxReferenceAdapter, source, {
      ...input,
      snapshot: {
        snapshotId: "metadata-snapshot", sourceId: source.sourceId,
        sourceFormat: "JSON", retrievedAt: input.snapshot.retrievedAt,
        retention: "METADATA_ONLY", sourceReference: "Test provider publication",
        nonRetentionReason: "Test retention restriction",
      },
    });
    expect(result.status).toBe("SUCCESS");
    expect(result.records[0].provenance.snapshotChecksum).toBeUndefined();
  });

  it("rejects invalid normalized records and altered snapshot provenance", () => {
    for (const invalidField of ["threshold", "snapshotId"]) {
      const result = runIngestion({
        ...taxReferenceAdapter,
        normalize: (row, context) => {
          const normalized = taxReferenceAdapter.normalize(row, context);
          if (!("record" in normalized)) return normalized;
          const record = incomeTaxRuleRecordSchema.parse(normalized.record);
          return { record: invalidField === "threshold"
            ? { ...record, threshold: "invalid" }
            : { ...record, provenance: { ...record.provenance, snapshotId: "wrong" } } };
        },
      }, source, input);
      expect(result.status).toBe("FAILED");
      expect(result.records).toEqual([]);
      expect(result.counts.rejectedRows).toBe(1);
      expect(result.rows[0].raw).toEqual(taxReferenceRow);
      expect(result.diagnostics[0].code).toBe(invalidField === "threshold" ? "INVALID_NUMERIC_VALUE" : "SOURCE_REVIEW_REQUIRED");
    }
  });

  it("accounts for every row and retains invalid input with field diagnostics", () => {
    const rows = [
      taxReferenceRow,
      { ...taxReferenceRow, id: "missing", threshold: undefined },
      { ...taxReferenceRow, id: "number", threshold: "100" },
      { ...taxReferenceRow, id: "date", effectiveFrom: "2026-02-30" },
      { ...taxReferenceRow, id: "unsupported", jurisdiction: "unknown" },
    ];
    const result = runIngestion(taxReferenceAdapter, source, { ...input, payload: JSON.stringify(rows) });
    expect(result.status).toBe("FAILED");
    expect(result.counts).toEqual({ inputRows: 5, acceptedRows: 1, rejectedRows: 4 });
    expect(result.rows).toHaveLength(5);
    expect(result.rows[2].raw).toEqual(rows[2]);
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      "MISSING_REQUIRED_SOURCE_FIELD", "INVALID_NUMERIC_VALUE", "INVALID_DATE", "UNSUPPORTED_SOURCE_VALUE",
    ]);
    expect(result.diagnostics.map(({ rowIndex }) => rowIndex)).toEqual([1, 2, 3, 4]);
  });

  it("rejects every occurrence of a duplicate source identifier", () => {
    const result = runIngestion(taxReferenceAdapter, source, { ...input, payload: JSON.stringify([taxReferenceRow, taxReferenceRow]) });
    expect(result.counts).toEqual({ inputRows: 2, acceptedRows: 0, rejectedRows: 2 });
    expect(result.diagnostics.map(({ code }) => code)).toEqual(["DUPLICATE_SOURCE_IDENTIFIER", "DUPLICATE_SOURCE_IDENTIFIER"]);
  });

  it.each(["RELEASE_READY", "DEV_ONLY", "BLOCKED_FROM_RELEASE", "REFERENCE_ONLY"] as const)("preserves explicit %s without promotion", (releaseStatus) => {
    const result = runIngestion(taxReferenceAdapter, source, { ...input, releaseStatus });
    expect(result.records[0].releaseStatus).toBe(releaseStatus);
  });

  it("rejects adapter attempts to promote release status or create undeclared modelled values", () => {
    for (const change of [{ releaseStatus: "RELEASE_READY" }, { valueType: "MODELLED_ESTIMATE" }]) {
      const result = runIngestion({
        ...taxReferenceAdapter,
        normalize: (row, context) => {
          const normalized = taxReferenceAdapter.normalize(row, context);
          if (!("record" in normalized)) return normalized;
          return { record: { ...incomeTaxRuleRecordSchema.parse(normalized.record), ...change } };
        },
      }, source, input);
      expect(result.records).toEqual([]);
      expect(result.counts.rejectedRows).toBe(1);
      expect(result.diagnostics[0].code).toBe("SOURCE_REVIEW_REQUIRED");
    }
  });

  it("retains explicit adapter geography diagnostics and thrown row errors", () => {
    const rejected = runIngestion({
      ...taxReferenceAdapter,
      normalize: () => ({ diagnostics: [{ code: "GEOGRAPHY_MAPPING_FAILURE", message: "No verified geography mapping" }] }),
    }, source, input);
    expect(rejected.rows[0].status).toBe("REJECTED");
    expect(rejected.diagnostics[0]).toMatchObject({ code: "GEOGRAPHY_MAPPING_FAILURE", rowIndex: 0 });
    const thrown = runIngestion({ ...taxReferenceAdapter, normalize: () => { throw new Error("Row parser failed"); } }, source, input);
    expect(thrown.counts.rejectedRows).toBe(1);
    expect(thrown.diagnostics[0].code).toBe("SOURCE_PARSE_FAILURE");
  });

  it("fails closed for unresolved or conflicting source governance", () => {
    for (const sourceStatus of [undefined, "CONFLICT_REVIEW", "UNRECOGNIZED_STATUS"]) {
      const result = runIngestion(taxReferenceAdapter, { ...source, sourceStatus, unresolvedMetadata: ["Review pending"] }, input);
      expect(result.records).toEqual([]);
      expect(result.diagnostics[0].code).toBe("SOURCE_REVIEW_REQUIRED");
    }
  });

  it("rejects mismatched snapshot sources and unsupported formats before parsing", () => {
    for (const change of [{ sourceId: "OTHER" }, { sourceFormat: "PDF" }]) {
      const result = runIngestion(taxReferenceAdapter, source, { ...input, snapshot: { ...input.snapshot, ...change } });
      expect(result.diagnostics[0].code).toBe("UNSUPPORTED_SOURCE_VALUE");
      expect(result.counts.inputRows).toBeNull();
    }
  });
});


it("accounts for a throwing row transform and continues processing subsequent rows", () => {
  const adapter = { ...taxReferenceAdapter, rowSchema: taxReferenceAdapter.rowSchema.transform((row) => {
    if (row.id === taxReferenceRow.id) throw new Error("custom transform failed");
    return row;
  }) };
  const result = runIngestion(adapter, source, { ...input, payload: JSON.stringify([taxReferenceRow, { ...taxReferenceRow, id: "accepted-after-transform-error" }]) });
  expect(result.status).toBe("FAILED");
  expect(result.counts).toEqual({ inputRows: 2, acceptedRows: 1, rejectedRows: 1 });
  expect(result.rows.map((row) => row.rowIndex)).toEqual([0, 1]);
  expect(result.diagnostics.every((d) => d.code === "SOURCE_PARSE_FAILURE")).toBe(true);
});
