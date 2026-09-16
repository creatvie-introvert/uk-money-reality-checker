import { classifications } from "@/product/transparency/classifications";
import type { PublicSource } from "@/product/transparency/provenance";
import { sourcePeriodText } from "@/product/transparency/periods";
import styles from "./transparency.module.css";

export function ClassificationLegend() {
  return <><dl className={styles.legend}>{classifications.map((item) => <div key={item.id}><dt>{item.label}</dt><dd>{item.meaning}</dd></div>)}</dl>
    <p>Classification describes provenance and type, not a quality score. Calculated values can derive from official evidence, and your amount can be more personally representative than an aggregate.</p>
  </>;
}
export function SourceCitation({ source }: { source: PublicSource }) {
  return <>
    <a href={source.url}>{source.organisation} — {source.title}{source.linkContext ? ` (${source.linkContext})` : ""}</a>
    <span className={styles.citationMeta}>{source.classification} · Source period: {sourcePeriodText(source.period)}</span>
    {(source.effectiveFrom || source.effectiveTo) && <span className={styles.citationMeta}>Recorded effective bounds: {sourcePeriodText(source.effectiveFrom ?? "not specified")} to {sourcePeriodText(source.effectiveTo ?? "not specified")}</span>}
  </>;
}
