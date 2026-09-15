"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { previewForm, previewNames, type PreviewName } from "./fixtures";
import type { ProductCalculation } from "@/product/calculator/orchestrator";
import { ResultsPage } from "@/components/report/ResultsPage";

const subscribe = () => () => {};
export function ResultsPreview() {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [calculation, setCalculation] = useState<ProductCalculation>();
  const [name, setName] = useState<PreviewName>("complete");
  const calculator = useRef<((form: unknown) => ProductCalculation) | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true); setCalculation(undefined); setError(false);
    try {
      const { createProductCalculator } = await import("@/product/calculator/orchestrator");
      calculator.current ??= createProductCalculator();
      setCalculation(calculator.current(previewForm(name)));
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <><section aria-label="Development fixture controls" style={{ padding: "12px 24px", background: "#fff4d7", fontFamily: "Arial, sans-serif", fontSize: 13 }}>
    <strong>Development preview · fixture inputs, calculated results</strong><p>These are explicit test scenarios, not your details. No values are saved. The calculator form is not connected yet.</p>
    <label htmlFor="fixture">Scenario </label><select id="fixture" value={name} onChange={(e) => { setName(e.target.value as PreviewName); setCalculation(undefined); }} disabled={busy || !hydrated}>{Object.entries(previewNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{" "}
    <button onClick={load} disabled={busy || !hydrated}>{busy ? "Calculating…" : "Calculate preview"}</button>
  </section>
    {error && <p role="alert">The preview could not be calculated. Review the fixture configuration.</p>}
    <div>{calculation?.state === "EVALUATED" ? <ResultsPage model={calculation.view} /> : <p style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>{busy ? "Calculating the selected scenario…" : "Choose a development scenario and calculate its result."}</p>}</div>
  </>;
}
