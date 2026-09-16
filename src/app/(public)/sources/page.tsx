import type { Metadata } from "next";
import Link from "next/link";
import { buildSourceRegister } from "@/product/transparency/sources";
import { ClassificationLegend } from "@/components/transparency/Provenance";
import { SourceEntry } from "@/components/transparency/SourceEntry";
import styles from "@/components/transparency/transparency.module.css";
import publicStyles from "@/components/public/public.module.css";

export const metadata: Metadata = { title: "Data sources | UK Money Reality", description: "Explore the published UK datasets, effective periods, geographies and limitations behind UK Money Reality." };
export default function SourcesPage() {
  const groups = buildSourceRegister();
  return <>
    <section className={styles.hero}><div className={styles.heroInner}><p className={publicStyles.eyebrow}>Evidence with its context</p><h1>Data sources</h1><p>Explore the publications behind the comparison: who published them, which places and periods they describe, and how UK Money Reality uses them.</p><Link href="/methodology" className={publicStyles.textLink}>Read the methodology →</Link></div></section>
    <div className={styles.content}>
      <section aria-labelledby="source-classifications"><h2 id="source-classifications">Know what a value represents</h2><ClassificationLegend /></section>
      <section className={styles.note} aria-labelledby="use-title"><h2 id="use-title">Evidence and calculator use</h2><p><strong>Used in calculator:</strong> supported calculation inputs. <strong>Used with conditions:</strong> evidence requires matching selections such as authority, band or source month. <strong>Reference only:</strong> context that does not currently resolve your personal household amount.</p><p>Only approved evidence is included. Development-only and blocked evidence are excluded. Reference evidence is labelled separately: tax and NI reference rules feed deterministic calculations, while spending and consumption references do not become personal budgets.</p><p>All source observations listed here are Official data. A monthly equivalent or other derived output is Calculated and retains its original source context. No calculated price tables are reproduced in this register.</p></section>
      <nav className={styles.groupNav} aria-label="Source categories">{groups.map((group) => <a href={`#${group.id}`} key={group.id}>{group.title}</a>)}</nav>
      {groups.map((group) => <section key={group.id} id={group.id} className={styles.group} aria-labelledby={`${group.id}-title`}><h2 id={`${group.id}-title`}>{group.title}</h2><p>{group.introduction}</p>{group.entries.map((entry) => <SourceEntry key={entry.id} entry={entry} />)}</section>)}
      <section className={styles.note} aria-labelledby="source-periods"><h2 id="source-periods">Dates and geography stay with the source</h2><p>There is no single universal ‘data date’ for every category. Source observations, publication dates and effective periods have different meanings. Publication dates are shown only when separately recorded.</p><p>The evidence applicability date helps determine which evidence matches your inputs; it does not mean every source was published on that date. A source link may now show a later edition. This register describes the recorded periods, not a claim of today’s prices.</p><p>Source geography can differ by category. London regional rent and Greater Glasgow rent retain their scope; council tax uses an authority. The calculator does not silently replace missing evidence with another geography.</p></section>
      <div className={styles.footerLinks}><Link href="/methodology" className={publicStyles.secondary}>Read the methodology</Link><Link href="/calculator" className={publicStyles.primary}>Compare your move</Link><Link href="/" className={publicStyles.textLink}>Back to home</Link></div>
    </div>
  </>;
}
