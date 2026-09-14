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
const { buildEnergyRelease } = await import("../../src/data/ingestion/energy/release.ts");
const results = [
  { family: "consumption", directory: "2024-v1/energy-consumption/", result: buildEnergyRelease("consumption") },
  { family: "prices", directory: "2026-q3-v1/energy-prices/", result: buildEnergyRelease("prices") },
];
// Validate both families before writing either one.
if (results.some(({ result }) => result.status !== "SUCCESS")) {
  for (const { family, result } of results) console.error(JSON.stringify({ family, status: result.status, coverage: result.coverage, validationDiagnostics: result.validationDiagnostics, diagnostics: result.runs.flatMap((r) => r.diagnostics) }, null, 2));
  process.exitCode = 1;
} else {
  const check = process.argv.includes("--check");
  for (const { family, directory, result } of results) {
    const target = new URL(`../../src/data/generated/${directory}`, import.meta.url);
    const files = {
      "audit.json": result.audit,
      [family === "consumption" ? "reference.json" : "release.json"]: result.release,
      "ingestion-report.json": { status: result.status, imports: result.imports, runs: result.runs, coverage: result.coverage, validationDiagnostics: result.validationDiagnostics },
    };
    if (!check) await mkdir(target, { recursive: true });
    for (const [name, value] of Object.entries(files)) {
      const bytes = `${JSON.stringify(value, null, 2)}\n`;
      const url = new URL(name, target);
      if (check) {
        if (await readFile(url, "utf8") !== bytes) throw new Error(`Generated artifact differs: ${directory}${name}`);
      } else await writeFile(url, bytes);
    }
    console.log(`${check ? "Verified" : "Generated"} ${family}: ${result.audit.records.length} records, 3 deterministic artifacts.`);
  }
}
