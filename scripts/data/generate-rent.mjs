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
const { buildRentRelease } = await import("../../src/data/ingestion/rent/release.ts");
const result = buildRentRelease();
if (result.status !== "SUCCESS") {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  const directory = new URL("../../src/data/generated/2026-07-v1/rent/", import.meta.url);
  const files = {
    "audit.json": result.audit,
    "release.json": result.release,
    "ingestion-report.json": {
      status: result.status, imports: result.imports, runs: result.runs,
      coverage: result.coverage, validationDiagnostics: result.validationDiagnostics,
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
  console.log(`${check ? "Verified" : "Generated"} 3 deterministic rent files: 35 observations; Edinburgh remains explicitly unresolved.`);
}
