import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import { sourceCatalog } from "@/data/provenance/catalog";
import { incomeTaxRuleRecordSchema, nationalInsuranceRuleRecordSchema } from "@/data/schemas/records";
import { directEvidenceReleaseSchema, referenceArtifactSchema } from "@/data/schemas/artifacts";
import { runIngestion } from "@/data/ingestion/run";
import { hmrcIncomeTaxAdapter } from "@/data/ingestion/production/adapters";
import { buildProductionReferences, controlledExtracts, productionSnapshots, validateProductionReference } from "@/data/ingestion/production/references";
import { validateReferenceCoverage } from "@/data/ingestion/production/coverage";

const built = buildProductionReferences();
const tax = built.incomeTax.reference!;
const ni = built.nationalInsurance.reference!;
const mutate = (change: (extracts: Array<{ rows: Record<string, unknown>[]; [key: string]: unknown }>) => void) => {
  const inputs = structuredClone(controlledExtracts) as unknown as Array<{ rows: Record<string, unknown>[]; [key: string]: unknown }>;
  change(inputs);
  return buildProductionReferences(inputs);
};

it("ingests rUK and Scottish tax rules with distinct authoritative provenance", () => {
  expect(built.status).toBe("SUCCESS");
  expect(tax.records).toHaveLength(15);
  const rules = tax.records.filter((r) => r.category === "income_tax_rule");
  expect(rules.filter((r) => r.jurisdiction === "rUK")).toHaveLength(6);
  expect(rules.filter((r) => r.jurisdiction === "Scotland")).toHaveLength(9);
  expect(rules.filter((r) => r.ruleType === "tax_band").map((r) => [r.jurisdiction, r.bandName, r.lowerBound, r.upperBound, r.rate])).toEqual(expect.arrayContaining([
    ["rUK", "basic", 12571, 50270, .2], ["rUK", "higher", 50271, 125140, .4], ["rUK", "additional", 125140, undefined, .45],
    ["Scotland", "starter", 12571, 16537, .19], ["Scotland", "basic", 16538, 29526, .2],
    ["Scotland", "intermediate", 29527, 43662, .21], ["Scotland", "higher", 43663, 75000, .42],
    ["Scotland", "advanced", 75001, 125140, .45], ["Scotland", "top", 125140, undefined, .48],
  ]));
  for (const jurisdiction of ["rUK", "Scotland"]) {
    expect(rules.filter((r) => r.jurisdiction === jurisdiction && r.ruleType !== "tax_band").map((r) => [r.bandName, r.threshold, r.rate, r.provenance.sourceId])).toEqual(expect.arrayContaining([
      ["personal-allowance", 12570, undefined, "SRC-011"], ["allowance-taper", 100000, .5, "SRC-011"], ["zero-allowance", 125140, undefined, "SRC-011"],
    ]));
  }
});

it("ingests category A NI using independently published period thresholds and rates", () => {
  expect(ni.records).toHaveLength(9);
  for (const [period, lel, pt, uel] of [["weekly", 129, 242, 967], ["monthly", 559, 1048, 4189], ["annual", 6708, 12570, 50270]]) {
    expect(ni.records.filter((r) => r.category === "national_insurance_rule").filter((r) => r.payPeriod === period).map((r) => [r.class, r.categoryLetter, r.bandName, r.lowerThreshold, r.upperThreshold, r.employeeRate])).toEqual(expect.arrayContaining([
      ["Class 1", "A", "LEL_TO_PT", lel, pt, 0], ["Class 1", "A", "PT_TO_UEL", pt, uel, .08], ["Class 1", "A", "ABOVE_UEL", uel, undefined, .02],
    ]));
  }
});

it.each(["personal-allowance", "allowance-taper", "zero-allowance", "starter", "basic", "intermediate", "higher", "advanced", "top"])("fails coverage for a missing Scottish %s rule", (bandName) => {
  const result = mutate((inputs) => inputs.forEach((e) => { e.rows = e.rows.filter((r) => !(r.jurisdiction === "Scotland" && r.bandName === bandName)); }));
  expect(result.status).toBe("FAILED");
  expect(result.incomeTax.reference).toBeUndefined();
  expect(result.incomeTax.coverageDiagnostics).toContainEqual(expect.objectContaining({ code: "MISSING_REFERENCE_RULE", dimension: `Scotland:${bandName}` }));
});

it.each(["weekly", "monthly", "annual"])("fails missing NI threshold coverage for %s", (period) => {
  const result = mutate((inputs) => { inputs[3].rows = inputs[3].rows.filter((r) => !(r.payPeriod === period && r.bandName === "PT_TO_UEL")); });
  expect(result.nationalInsurance.reference).toBeUndefined();
  expect(result.nationalInsurance.coverageDiagnostics).toContainEqual(expect.objectContaining({ dimension: `Class 1:A:${period}:PT_TO_UEL`, code: "MISSING_REFERENCE_RULE" }));
});

it.each([
  { index: 0, field: "threshold" }, { index: 0, field: "rate", row: 1 },
  { index: 2, field: "rate" }, { index: 2, field: "upperBound" },
  { index: 3, field: "employeeRate" }, { index: 3, field: "lowerThreshold" }, { index: 3, field: "upperThreshold" },
])("rejects a missing required $field in extract $index", ({ index, field, row = 0 }) => {
  const result = mutate((inputs) => { delete inputs[index].rows[row][field]; });
  expect(result.status).toBe("FAILED");
  expect(result.incomeTax.reference === undefined || result.nationalInsurance.reference === undefined).toBe(true);
});

it.each([0, 2, 3])("rejects wrong year/effective dates without row loss for extract %i", (index) => {
  for (const fields of [{ taxYear: "2025/26" }, { effectiveFrom: "2027-04-06", effectiveTo: "2026-04-05" }]) {
    const result = mutate((inputs) => Object.assign(inputs[index].rows[0], fields));
    expect(result.status).toBe("FAILED");
    expect(result.runs[index].rows[0].status).toBe("REJECTED");
    expect(result.runs[index].diagnostics.length).toBeGreaterThan(0);
    expect(result.runs[index].counts.inputRows).toBe(result.runs[index].counts.acceptedRows + result.runs[index].counts.rejectedRows);
    expect(result.runs[index].rows[0].raw).toMatchObject(fields);
  }
});

it("rejects reversed dates and bounds in canonical contracts as well as ingestion", () => {
  const taxBand = tax.records.find((r) => r.category === "income_tax_rule" && r.ruleType === "tax_band")!;
  const niBand = ni.records[0];
  expect(incomeTaxRuleRecordSchema.safeParse({ ...taxBand, effectiveFrom: "2028-01-01" }).success).toBe(false);
  expect(nationalInsuranceRuleRecordSchema.safeParse({ ...niBand, effectiveFrom: "2028-01-01" }).success).toBe(false);
  expect(incomeTaxRuleRecordSchema.safeParse({ ...taxBand, lowerBound: 20, upperBound: 10 }).success).toBe(false);
  expect(nationalInsuranceRuleRecordSchema.safeParse({ ...niBand, lowerThreshold: 20, upperThreshold: 10 }).success).toBe(false);
  for (const [index, fields] of [[2, { lowerBound: 20000, upperBound: 10000 }], [3, { lowerThreshold: 500, upperThreshold: 100 }]] as const) {
    const result = mutate((inputs) => Object.assign(inputs[index].rows[0], fields));
    expect(result.status).toBe("FAILED");
    expect(result.runs[index].counts.rejectedRows).toBe(1);
  }
});

it("preserves snapshot provenance, limitations, and raw row values without liability arithmetic", () => {
  for (const [index, run] of built.runs.entries()) {
    expect(run.status).toBe("SUCCESS");
    expect(run.counts.inputRows).toBe(controlledExtracts[index].rows.length);
    expect(run.rows).toHaveLength(run.counts.inputRows!);
    run.rows.forEach((outcome) => {
      expect(outcome.status).toBe("ACCEPTED");
      if (outcome.status !== "ACCEPTED") return;
      const { id: _id, ...rawFields } = outcome.raw as Record<string, unknown>;
      void _id;
      expect(outcome.record).toMatchObject(rawFields);
      expect(outcome.record.provenance).toMatchObject({
        sourceId: controlledExtracts[index].snapshot.sourceId, snapshotId: run.snapshotId,
        sourceUrl: controlledExtracts[index].snapshot.sourceUrl, sourceFormat: "HTML",
        retrievedAt: controlledExtracts[index].snapshot.retrievedAt, importedAt: controlledExtracts[index].importedAt,
        parserVersion: "1.0.0", importVersion: "2026-27-v1", limitations: controlledExtracts[index].limitations,
      });
      expect(outcome.record.provenance.snapshotChecksum).toBeUndefined();
      expect(outcome.record.releaseStatus).toBe("REFERENCE_ONLY");
      expect(outcome.record.valueType).toBe("OBSERVED_DATA");
    });
  }
});

it("rejects duplicates and malformed extra rows without silently dropping either", () => {
  const result = mutate((inputs) => inputs[2].rows.push({ ...inputs[2].rows[0] }, { unexpected: true }));
  expect(result.status).toBe("FAILED");
  expect(result.runs[2].counts).toEqual({ inputRows: 8, acceptedRows: 5, rejectedRows: 3 });
  expect(result.runs[2].rows).toHaveLength(8);
  expect(result.runs[2].diagnostics.map((d) => d.code)).toContain("DUPLICATE_SOURCE_IDENTIFIER");
});

it.each(["RELEASE_READY", "DEV_ONLY", "BLOCKED_FROM_RELEASE"] as const)("never promotes or accepts %s", (releaseStatus) => {
  const input = { ...built.imports[0], releaseStatus };
  const run = runIngestion(hmrcIncomeTaxAdapter, sourceCatalog.find((s) => s.sourceId === "SRC-011")!, input);
  expect(run.status).toBe("FAILED");
  expect(run.records).toEqual([]);
  expect(() => validateProductionReference("income-tax", { ...tax, records: tax.records.map((r) => ({ ...r, releaseStatus })) })).toThrow();
});

it("enforces USER_ENTERED exclusion and forbids direct evidence output", () => {
  expect(directEvidenceReleaseSchema.safeParse({ ...tax, kind: "DIRECT_EVIDENCE_RELEASE" }).success).toBe(false);
  expect(() => validateProductionReference("income-tax", { ...tax, records: tax.records.map((r) => ({ ...r, valueType: "USER_ENTERED" })) })).toThrow();
});

it("validates manifest counts and actual snapshot registry reconciliation", () => {
  expect(() => validateProductionReference("income-tax", tax)).not.toThrow();
  for (const manifest of [{ ...tax.manifest, recordCount: 0 }, { ...tax.manifest, sourceSnapshotIds: ["invented"] }]) {
    expect(referenceArtifactSchema.safeParse({ ...tax, manifest }).success).toBe(false);
  }
  expect(() => validateProductionReference("income-tax", tax, [])).toThrow(/reconciliation/);
  expect(() => validateProductionReference("income-tax", tax, [...productionSnapshots, productionSnapshots[0]])).toThrow(/Duplicate/);
  const tampered = structuredClone(tax);
  tampered.records[0].provenance.sourceUrl = "https://example.com/wrong";
  expect(() => validateProductionReference("income-tax", tampered)).toThrow(/reconciliation/);
  const relabelled = structuredClone(tax);
  const old = relabelled.records[0].provenance.snapshotId;
  relabelled.records.forEach((r) => { if (r.provenance.snapshotId === old) r.provenance.snapshotId = "fake"; });
  relabelled.manifest.sourceSnapshotIds = relabelled.manifest.sourceSnapshotIds.map((id) => id === old ? "fake" : id);
  expect(referenceArtifactSchema.safeParse(relabelled).success).toBe(true);
  expect(() => validateProductionReference("income-tax", relabelled)).toThrow(/reconciliation/);
});

it("applies coverage when validating a deserialized artifact, even with a repaired manifest", () => {
  const records = tax.records.filter((r) => r.category !== "income_tax_rule" || r.bandName !== "personal-allowance");
  expect(() => validateProductionReference("income-tax", { ...tax, records, manifest: { ...tax.manifest, recordCount: records.length } })).toThrow(/MISSING_REFERENCE_RULE/);
  const wrongYear = tax.records.map((r) => ({ ...r, taxYear: "2025/26" }));
  expect(validateReferenceCoverage("income-tax", wrongYear)).toContainEqual(expect.objectContaining({ code: "INVALID_REFERENCE_RULE" }));
});

it("rejects inconsistent NI boundaries and wrong class/category instead of fallback", () => {
  expect(mutate((e) => { e[3].rows[1].lowerThreshold = 243; }).status).toBe("FAILED");
  for (const fields of [{ class: "Class 4" }, { categoryLetter: "B" }]) {
    expect(mutate((e) => Object.assign(e[3].rows[0], fields)).status).toBe("FAILED");
  }
});

it("keeps adapter code free of arithmetic operators and runtime source calls", () => {
  const source = ts.createSourceFile("adapters.ts", readFileSync("src/data/ingestion/production/adapters.ts", "utf8"), ts.ScriptTarget.Latest, true);
  const arithmetic = new Set([ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken, ts.SyntaxKind.AsteriskToken, ts.SyntaxKind.SlashToken, ts.SyntaxKind.PercentToken, ts.SyntaxKind.AsteriskAsteriskToken]);
  const visit = (node: ts.Node) => {
    if (ts.isBinaryExpression(node)) expect(arithmetic.has(node.operatorToken.kind)).toBe(false);
    if (ts.isCallExpression(node)) expect(node.expression.getText(source)).not.toMatch(/^(fetch|Math\.|calculate)/);
    ts.forEachChild(node, visit);
  };
  visit(source);
});

describe("deterministic generated files", () => {
  it("reproduces every generated byte offline and validates saved reference contracts", () => {
    expect(execFileSync(process.execPath, ["scripts/data/generate-references.mjs", "--check"], { encoding: "utf8" })).toContain("Verified 5");
    for (const dataset of ["income-tax", "national-insurance"] as const) {
      const saved: unknown = JSON.parse(readFileSync(`src/data/generated/2026-27-v1/${dataset}.reference.json`, "utf8"));
      expect(() => validateProductionReference(dataset, saved)).not.toThrow();
    }
  });
});


it.each(["personal-allowance", "allowance-taper", "zero-allowance", "basic", "higher", "additional"])("fails coverage for missing rUK %s", (bandName) => {
  const result = mutate((inputs) => inputs.forEach((e) => { e.rows = e.rows.filter((r) => !(r.jurisdiction === "rUK" && r.bandName === bandName)); }));
  expect(result.incomeTax.reference).toBeUndefined();
  expect(result.incomeTax.coverageDiagnostics).toContainEqual(expect.objectContaining({ dimension: `rUK:${bandName}`, code: "MISSING_REFERENCE_RULE" }));
});

it("rejects duplicate semantic rules even when their source IDs differ", () => {
  const result = mutate((inputs) => inputs[2].rows.push({ ...inputs[2].rows[0], id: "different-id" }));
  expect(result.incomeTax.reference).toBeUndefined();
  expect(result.incomeTax.coverageDiagnostics).toContainEqual(expect.objectContaining({ code: "DUPLICATE_REFERENCE_RULE" }));
});

it("rejects altered snapshot metadata before generation", () => {
  expect(() => mutate((inputs) => {
    const snapshot = inputs[0].snapshot as Record<string, unknown>;
    snapshot.sourceUrl = "https://example.com/unapproved";
  })).toThrow(/altered snapshot/);
});

it("keeps the Scottish advanced/top boundary continuous above GBP 125140 without a GBP 125141 gap", () => {
  const bands = tax.records.filter((r) => r.category === "income_tax_rule")
    .filter((r) => r.jurisdiction === "Scotland" && r.ruleType === "tax_band");
  const advanced = bands.find((r) => r.bandName === "advanced")!;
  const top = bands.find((r) => r.bandName === "top")!;
  expect(advanced).toMatchObject({ upperBound: 125140, upperInclusive: true, rate: .45, thresholdBasis: "published_income_with_standard_allowance" });
  expect(top).toMatchObject({ lowerBound: 125140, lowerInclusive: false, rate: .48, thresholdBasis: "published_income_with_standard_allowance" });
  expect(top.upperBound).toBeUndefined();
  expect(advanced.upperBound).toBe(top.lowerBound);
  // Interval-membership assertions only: no tax/allowance/liability arithmetic.
  for (const income of [125140, 125140.01, 125141]) {
    const matches = [advanced, top].filter((band) =>
      (band.lowerInclusive ? income >= band.lowerBound! : income > band.lowerBound!) &&
      (band.upperBound === undefined || (band.upperInclusive ? income <= band.upperBound : income < band.upperBound)));
    expect(matches.map((r) => r.bandName)).toEqual([income === 125140 ? "advanced" : "top"]);
  }
});

it("retains Scottish policy provenance with current operational confirmation and the locked resolution", () => {
  const bands = tax.records.filter((r) => r.category === "income_tax_rule")
    .filter((r) => r.jurisdiction === "Scotland" && r.ruleType === "tax_band");
  for (const { provenance } of bands) {
    expect(provenance.sourceId).toBe("SRC-013");
    expect(provenance.sourceUrl).toContain("https://www.gov.scot/");
    expect(provenance.methodologyNotes).toContain("https://www.gov.uk/scottish-income-tax");
    expect(provenance.methodologyNotes).toContain("https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027");
    expect(provenance.methodologyNotes).toContain("Over GBP 125141");
    expect(provenance.methodologyNotes).toContain("not policy-rule ambiguity");
    expect(provenance.limitations.join(" ")).toContain("not used alone as final operational confirmation");
  }
  const changed = structuredClone(tax);
  const band = changed.records.find((r) => r.provenance.sourceId === "SRC-013")!;
  band.provenance.methodologyNotes = "Operational confirmation removed";
  expect(() => validateProductionReference("income-tax", changed)).toThrow(/reconciliation/);
});
