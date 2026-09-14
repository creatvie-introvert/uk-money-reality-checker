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
const { buildTransportRelease } = await import("../../src/data/ingestion/transport/release.ts");
const result = buildTransportRelease();
if (result.status !== "SUCCESS") {
  console.error(JSON.stringify({ coverage: result.coverage, validationDiagnostics: result.validationDiagnostics, diagnostics: result.runs.flatMap((r) => r.diagnostics) }, null, 2));
  process.exitCode = 1;
} else {
  const check = process.argv.includes("--check");
  const target = new URL("../../src/data/generated/2026-09-v1/transport/", import.meta.url);
  const files = {
    "audit.json": result.audit, "release.json": result.release, "calculated.json": result.calculated,
    "ingestion-report.json": { status: result.status, imports: result.imports, runs: result.runs, coverage: result.coverage, validationDiagnostics: result.validationDiagnostics },
  };
  if (!check) await mkdir(target, { recursive: true });
  for (const [name, value] of Object.entries(files)) {
    const bytes = `${JSON.stringify(value, null, 2)}\n`;
    const url = new URL(name, target);
    if (check) {
      if (await readFile(url, "utf8") !== bytes) throw new Error(`Generated artifact differs: transport/${name}`);
    } else await writeFile(url, bytes);
  }
  console.log(`${check ? "Verified" : "Generated"} transport: ${result.audit.records.length} records, 4 deterministic artifacts.`);
}
