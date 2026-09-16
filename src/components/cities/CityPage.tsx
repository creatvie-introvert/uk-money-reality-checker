import Link from "next/link";
import { SourceCitation } from "@/components/transparency/Provenance";
import type { CityPageModel } from "@/product/cities/registry";
import styles from "./cities.module.css";
import publicStyles from "@/components/public/public.module.css";

export function CityPage({ model }: { model: CityPageModel }) {
  const { city, coverage } = model;
  return <>
    <section className={styles.hero}><div className={styles.heroInner}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><ol><li><Link href="/">Home</Link></li><li><Link href="/cities">Cities</Link></li><li><span aria-current="page">{city.displayName}</span></li></ol></nav>
      <p className={publicStyles.eyebrow}>{city.nation} · Evidence and your household</p>
      <h1>Living costs in {city.displayName}</h1>
      <p>Explore what evidence UK Money Reality currently supports for {city.displayName}, where your own household amounts are still needed, and what the calculator can compare.</p>
      <p>{city.summary}</p>
      <Link href={model.calculatorHref} className={publicStyles.primary}>Compare a move involving {city.displayName}</Link>
    </div></section>
    <section className={styles.content} aria-labelledby="coverage-title">
      <h2 id="coverage-title">Evidence at a glance</h2>
      <p className={styles.intro}>Coverage describes the evidence available, not a complete household budget. Open a category to see its scope and what you need to provide.</p>
      <ul className={styles.coverage}>{coverage.map((item) => <li key={item.id}><Link href={`#${item.id}`}>{item.label}</Link><span>{item.state}</span></li>)}</ul>
    </section>
    <div className={styles.content}>
      {coverage.map((item) => <section key={item.id} id={item.id} className={styles.evidence} aria-labelledby={`${item.id}-title`}>
        <div><h2 id={`${item.id}-title`}>{item.label}</h2><span className={styles.state}>{item.state}</span></div>
        <div className={styles.body}><p className={styles.summary}>{item.summary}</p>{item.context.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <p className={styles.period}><strong>Source periods: </strong>{item.sources.length ? [...new Set(item.sources.map((source) => source.period))].join(" · ") : "No matching published evidence in this release."}</p>
          {item.sources.length > 0 && <details className={styles.details}><summary>{item.label}: sources and effective periods</summary><ul>{item.sources.map((source, index) => <li key={index}>
            <SourceCitation source={source} />
          </li>)}</ul></details>}
        </div>
      </section>)}
      <section className={styles.note} aria-labelledby="tax-title"><h2 id="tax-title">Income tax context</h2><p>{model.taxContext}</p></section>
      <section className={styles.note} aria-labelledby="periods-title"><h2 id="periods-title">Evidence periods and limitations</h2>
        <p>Each category keeps its own published period. A source period is not a claim that a price applies today. The source links above identify the pinned evidence; later-date use may need refreshed evidence.</p>
        <p>Published evidence can support a calculation only when its geography, period and household conditions match. Reference evidence alone does not resolve a household amount. Your calculator results explain the basis of the values actually used.</p>
        <p>Read the <Link href="/methodology">Methodology</Link> and explore the <Link href="/sources">Sources</Link> for the calculations, evidence periods and limitations.</p>
      </section>
      <div className={publicStyles.actions}><Link href={model.calculatorHref} className={publicStyles.primary}>Compare a move involving {city.displayName}</Link><Link href="/cities" className={publicStyles.secondary}>Explore all supported cities</Link></div>
      <p className={publicStyles.supporting}>Choose your current and destination cities in the calculator. This link does not preselect either location.</p>
    </div>
  </>;
}
