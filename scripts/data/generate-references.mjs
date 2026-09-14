import { registerHooks } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";

// Node strips TypeScript; resolve the repository's extensionless relative imports.
// This hook is local to this offline script and never runs in Next.js.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".json")) return nextLoad(url, { ...context, importAttributes: { type: "json" } });
    return nextLoad(url, context);
  },
});
const { buildProductionReferences } = await import("../../src/data/ingestion/production/references.ts");
const result = buildProductionReferences();
if (result.status !== "SUCCESS") {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  const directory = new URL("../../src/data/generated/2026-27-v1/", import.meta.url);
  const files = {
    "income-tax.audit.json": result.incomeTax.audit,
    "income-tax.reference.json": result.incomeTax.reference,
    "national-insurance.audit.json": result.nationalInsurance.audit,
    "national-insurance.reference.json": result.nationalInsurance.reference,
    "ingestion-report.json": {
      status: result.status, imports: result.imports, runs: result.runs,
      coverage: { incomeTax: result.incomeTax.coverageDiagnostics, nationalInsurance: result.nationalInsurance.coverageDiagnostics },
    },
  };
  const check = process.argv.includes("--check");
  if (!check) await mkdir(directory, { recursive: true });
  for (const [name, value] of Object.entries(files)) {
    const serialized = `${JSON.stringify(value, null, 2)}\n`;
    const url = new URL(name, directory);
    if (check) {
      if (await readFile(url, "utf8") !== serialized) throw new Error(`Generated artifact differs: ${name}`);
    } else await writeFile(url, serialized);
  }
  console.log(`${check ? "Verified" : "Generated"} ${Object.keys(files).length} deterministic files: 15 income tax rules, 9 NI rules.`);
}
