import type { PublicSourceEntry } from "@/product/transparency/sources";
import { sourcePeriodText } from "@/product/transparency/periods";
import { SourceCitation } from "./Provenance";
import styles from "./transparency.module.css";

export function SourceEntry({ entry }: { entry: PublicSourceEntry }) {
  return <details id={entry.id} className={styles.source}>
    <summary><h3>{entry.organisation} — {entry.title}</h3><span className={styles.meta}>{entry.useStatus} · {[...new Set(entry.citations.map((s) => sourcePeriodText(s.period)))].join(" · ")}</span></summary>
    <div className={styles.sourceBody}>
      <div className={styles.badges}><span className={styles.badge}>{entry.classification}</span><span className={styles.badge}>{entry.evidenceRole}</span><span className={styles.badge}>{entry.useStatus}</span></div>
      <h4>How it is used</h4><p>{entry.howUsed}</p>
      <h4>Geography and scope</h4><ul>{[...entry.geography, ...entry.scope].map((text) => <li key={text}>{text}</li>)}</ul>
      {entry.publicationDates.length > 0 && <p><strong>Recorded publication date: </strong>{entry.publicationDates.map(sourcePeriodText).join(" · ")}</p>}
      <h4>Limitations</h4><ul>{entry.limitations.map((text) => <li key={text}>{text}</li>)}</ul>
      <h4>Source links and periods</h4><ul className={styles.citations}>{entry.citations.map((source, i) => <li key={i}><SourceCitation source={source} /></li>)}</ul>
    </div>
  </details>;
}
