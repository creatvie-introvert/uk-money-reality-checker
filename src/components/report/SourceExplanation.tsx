import type { Explanation } from "@/product/calculator/contracts";
import styles from "./results.module.css";

import { sourcePeriodText } from "@/product/transparency/periods";
export { sourcePeriodText } from "@/product/transparency/periods";

export function ExplanationContent({ explanation }: { explanation: Explanation }) {
  return <><h4>Basis</h4><p>{explanation.summary}</p>
    {explanation.baselineStatus === "UNAVAILABLE" && <p>Source baseline unavailable. An entered amount, where shown, is yours.</p>}
    {explanation.sources.length > 0 && <h4>Sources</h4>}
    {explanation.sources.map((s) => <p key={s.id}><strong>{s.organisation}</strong> · {sourcePeriodText(s.period ?? "Period not supplied")}<br />{s.geography}<br />
      {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}
      {(s.effectiveFrom || s.effectiveTo) && <small>Effective: {sourcePeriodText(s.effectiveFrom ?? "not specified")} to {sourcePeriodText(s.effectiveTo ?? "not specified")}</small>}</p>)}
    {explanation.limitations.length > 0 && <><h4>Limitations</h4><ul>{explanation.limitations.map((l) => <li key={l}>{l}</li>)}</ul></>}
</>;
}

export function ExplanationDetails({ explanation, context }: { explanation: Explanation; context: string }) {
  return <details className={styles.details}><summary aria-label={`Basis & sources: ${context}`}>Basis & sources</summary><ExplanationContent explanation={explanation} /></details>;
}
