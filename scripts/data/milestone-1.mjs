import { registerHooks } from "node:module";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
registerHooks({
  resolve(s, c, next) { return next(s.startsWith(".") && !/\.[a-z]+$/i.test(s) ? `${s}.ts` : s, c); },
  load(u, c, next) { return next(u, u.endsWith(".json") ? { ...c, importAttributes: { type: "json" } } : c); },
});
const { artifactSchema } = await import("../../src/data/schemas/artifacts.ts");
const { sourceCatalog } = await import("../../src/data/provenance/catalog.ts");
const check = process.argv.includes("--check");
for (const name of ["references", "council-tax", "rent", "energy", "water", "spending", "transport"]) {
  const result = spawnSync(process.execPath, [`scripts/data/generate-${name}.mjs`, ...(check ? ["--check"] : [])], { stdio: "inherit" });
  assert.equal(result.status, 0, `${name} generation/verification failed`);
}
const root = "src/data/generated";
const files = readdirSync(root, { recursive: true }).filter((p) => p.endsWith(".json")).sort();
assert.equal(files.length, 32, "Review inventory when production artifact set changes");
const data = new Map(files.map((p) => [p, JSON.parse(readFileSync(`${root}/${p}`, "utf8"))]));
const reports = [...data.values()].filter((d) => d.runs);
const snapshots = new Map();
const unique = (xs) => [...new Set(xs)].sort();
let inputRows = 0;
for (const report of reports) {
  assert.equal(report.status, "SUCCESS");
  for (const input of report.imports) {
    const previous = snapshots.get(input.snapshot.snapshotId);
    if (previous) assert.deepEqual(previous, input.snapshot);
    snapshots.set(input.snapshot.snapshotId, input.snapshot);
  }
  for (const run of report.runs) {
    assert.equal(run.status, "SUCCESS");
    const c = run.counts;
    assert.equal(c.inputRows, c.acceptedRows + c.rejectedRows);
    assert.equal(c.rejectedRows, 0);
    assert.equal(run.rows.length, c.inputRows);
    assert.equal(run.records.length, c.acceptedRows);
    assert.deepEqual(run.rows.map((r) => r.rowIndex), Array.from({ length: c.inputRows }, (_, i) => i));
    assert.deepEqual(run.rows.filter((r) => r.status === "ACCEPTED").map((r) => r.record), run.records);
    inputRows += c.inputRows;
  }
}
const observations = new Map();
const calculatedIds = new Set();
const inventory = [];
for (const [path, d] of data) {
  const item = { path: `${root}/${path}`, artifactType: d.kind ?? "INGESTION_REPORT", sha256: createHash("sha256").update(readFileSync(`${root}/${path}`)).digest("hex") };
  if (d.kind) {
    artifactSchema.parse(d);
    assert.equal(new Set(d.records.map((r) => r.recordId)).size, d.records.length);
    assert.deepEqual(d.records.map((r) => r.recordId), d.records.map((r) => r.recordId).sort((a,b) => a.localeCompare(b,"en")));
    assert.deepEqual(d.manifest.sourceSnapshotIds, unique(d.records.map((r) => r.provenance.snapshotId)));
    for (const r of d.records) {
      assert.ok(["OBSERVED_DATA", "CALCULATED"].includes(r.valueType), r.recordId);
      const p = r.provenance;
      const source = sourceCatalog.find((s) => s.sourceId === p.sourceId);
      assert.ok(source, p.sourceId);
      const snapshot = snapshots.get(p.snapshotId);
      assert.ok(snapshot, p.snapshotId);
      for (const field of ["sourceId", "retrievedAt", "sourceFormat"]) assert.equal(p[field], snapshot[field], `${r.recordId}:${field}`);
      assert.equal(p.snapshotChecksum, snapshot.checksum);
      if (p.snapshotChecksum) assert.match(p.snapshotChecksum, /^sha256:[a-f0-9]{64}$/);
      assert.ok(p.sourceUrl && p.organisation && p.publicationTitle && p.licenceReference && p.methodologyNotes);
      assert.ok(p.limitations.length || source.useNote, `${r.recordId}: limitations in record or catalogue`);
      assert.ok(p.sourcePeriod || p.effectiveFrom);
      if (r.valueType === "CALCULATED") calculatedIds.add(r.recordId);
      if (r.category !== "transport_fare" && r.category !== "transport_period_conversion") {
        for (const field of ["organisation", "publicationTitle", "publicationDate", "licenceReference"]) assert.equal(p[field], source[field], `${r.recordId}: catalogue ${field}`);
      }
      if (r.valueType === "OBSERVED_DATA") {
        const previous = observations.get(r.recordId);
        if (previous) assert.deepEqual(previous, r);
        observations.set(r.recordId, r);
      }
    }
    Object.assign(item, { releaseId: d.manifest.releaseId, schemaVersion: d.manifest.schemaVersion, recordCount: d.records.length, categoryIds: unique(d.records.map((r) => r.category)), sourceIds: unique(d.records.map((r) => r.provenance.sourceId)), snapshotIds: d.manifest.sourceSnapshotIds, classifications: unique(d.records.map((r) => r.valueType)), releaseStatuses: unique(d.records.map((r) => r.releaseStatus)) });
  } else {
    Object.assign(item, { sourceIds: unique(d.runs.map((r) => r.sourceId)), snapshotIds: unique(d.runs.map((r) => r.snapshotId)), inputRows: d.runs.reduce((n,r) => n+r.counts.inputRows,0), emittedRecords: d.runs.reduce((n,r) => n+r.records.length,0) });
  }
  inventory.push(item);
}
for (const d of data.values()) for (const r of d.records ?? []) if (r.valueType === "CALCULATED") {
  const parent = observations.get(r.observedRecordId);
  assert.ok(parent, r.recordId);
  const { methodologyNotes: derivativeMethodology, ...derivativeProvenance } = r.provenance;
  const { methodologyNotes: parentMethodology, ...parentProvenance } = parent.provenance;
  assert.ok(derivativeMethodology && parentMethodology);
  assert.deepEqual(derivativeProvenance, parentProvenance);
  assert.equal(r.releaseStatus, "REFERENCE_ONLY");
}
assert.equal(inputRows, observations.size);
const report = (path) => data.get(`${path}/ingestion-report.json`);
const paths = { rent: "2026-07-v1/rent", council_tax: "2026-27-v1/council-tax", energy_consumption: "2024-v1/energy-consumption", energy_price: "2026-q3-v1/energy-prices", water: "2026-27-v1/water", groceries: "fye2024-v1/groceries", household_spending: "fye2025-v1/household-spending", transport: "2026-09-v1/transport" };
const cities = report(paths.transport).coverage.cityCoverage;
const coverage = cities.map(({ cityId, city }) => {
  const cell = (category, status, qualification) => ({ category, status, qualification, report: `${root}/${paths[category] ?? "2026-27-v1"}/ingestion-report.json` });
  const water = report(paths.water).coverage.cityCoverage.find((c) => c.cityId === cityId);
  return { cityId, city, cells: [
    cell("income_tax", "REFERENCE_INPUT_AVAILABLE", `${["LOC-EDI","LOC-GLA"].includes(cityId) ? "Scotland" : "rUK"} rules; 2026/27; actual tax jurisdiction required.`),
    cell("national_insurance", "REFERENCE_INPUT_AVAILABLE", "UK employee Class 1 category A only; published weekly/monthly/annual thresholds."),
    cell("rent", cityId === "LOC-EDI" ? "SOURCE_GAP" : "DIRECT_EVIDENCE_AVAILABLE", cityId === "LOC-EDI" ? "EDINBURGH_RENT_SOURCE_UNRESOLVED; no substitute." : cityId === "LOC-GLA" ? "Greater Glasgow S33000009, not Glasgow City; July 2026." : cityId === "LOC-LON" ? "ONS region E12000007; July 2026." : "Reviewed local-authority July 2026 observations; separate bedroom measures."),
    cell("council_tax", cityId === "LOC-LON" ? "APPLICABILITY_UNRESOLVED" : "DIRECT_EVIDENCE_AVAILABLE", cityId === "LOC-LON" ? "LONDON_CITY_DEFAULT_UNRESOLVED; no borough selection or scalar." : "Authority bands A–H, 2026/27; actual band and household applicability required."),
    cell("energy_consumption", "REFERENCE_INPUT_AVAILABLE", "Selected 2024 NEED joint profiles; NOT_CITY_SPECIFIC; MODEL_REQUIRED for household application; no adult occupancy joint evidence."),
    cell("energy_price", "APPLICABILITY_UNRESOLVED", "126 regional Q3 2026 facts; ENERGY_CITY_REGION_MAPPING_UNRESOLVED; postcode/DNO mapping and reuse review required."),
    cell("water", water.applicability === "UNRESOLVED" ? "APPLICABILITY_UNRESOLVED" : "PARTIAL", `${water.providers.clean_water} clean water / ${water.providers.wastewater} wastewater; ${water.supportedRegime}; ${water.conditions.join(" ")} Address default NOT_ESTABLISHED.`),
    cell("groceries", "NOT_CITY_SPECIFIC", "FYE 2024 UK per-person reference; MODEL_REQUIRED; no city budget; Essentials/Lifestyle mapping unapproved."),
    cell("household_spending", "NOT_CITY_SPECIFIC", "FYE 2025 UK all-households reference; MODEL_REQUIRED; no household-profile model; Essentials/Lifestyle mapping unapproved."),
    cell("transport", "SELECTED_PRODUCTS_ONLY", "Conditional operator/network products; every city default unresolved; some prices valid only as verified 2026-09-14; no optimizer."),
  ] };
});
const output = { scope: "Milestone 1 pinned evidence audit; no latest-price or public redistribution approval", productionArtifactCount: files.length, observedRecords: observations.size, calculatedRecords: calculatedIds.size, inputRows, rejectedRows: 0, inventory, coverage };
const target = "docs/data/milestone-1-inventory.json";
const bytes = `${JSON.stringify(output, null, 2)}\n`;
if (check) assert.equal(readFileSync(target,"utf8"), bytes, "Closure inventory/coverage drift; review and regenerate");
else writeFileSync(target, bytes);
console.log(`Milestone 1: ${files.length} artifacts; ${inputRows} observed rows reconciled; 80 coverage cells verified.`);
