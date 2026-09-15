import Link from "next/link";
import type { ResultsViewModel } from "@/product/calculator/view-model";
import type { Explanation } from "@/product/calculator/contracts";
import styles from "./results.module.css";

function ExplanationDetails({ explanation }: { explanation: Explanation }) {
  return <details className={styles.details}><summary>Basis & sources</summary><p>{explanation.summary}</p>
    {explanation.baselineStatus === "UNAVAILABLE" && <p>Source baseline unavailable. An entered amount, where shown, is yours.</p>}
    {explanation.sources.map((s) => <p key={s.id}><strong>{s.organisation}</strong> · {s.period}<br />{s.geography}<br />
      {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}
      {(s.effectiveFrom || s.effectiveTo) && <small>Effective: {s.effectiveFrom} to {s.effectiveTo ?? "not specified"}</small>}</p>)}
    {explanation.limitations.length > 0 && <ul>{explanation.limitations.map((l) => <li key={l}>{l}</li>)}</ul>}
  </details>;
}
export function ResultsHeader() {
  return <header className={styles.header}><Link href="/" className={styles.brand}>UK Money Reality<small>REAL NUMBERS. BRIGHTER DECISIONS.</small></Link>
    <nav aria-label="Main navigation"><Link href="/calculator/results">Move Calculator</Link><span aria-disabled="true" title="City pages are not connected yet">Cities</span><a href="#breakdown">Compare</a><a href="#methodology">How it works</a><a className={styles.outlineButton} href="/calculator/results">New comparison</a></nav>
  </header>;
}
/** Presentation only: receives composed strings, states and visual scales, never engine data. */
export function ResultsPage({ model }: { model: ResultsViewModel }) {
  return <div className={styles.page}><a className={styles.skip} href="#results-main">Skip to results</a><ResultsHeader />
    <main id="results-main" className={styles.container}>
      <p className={styles.breadcrumb}><Link href="/">Home</Link> › Move Calculator › Your results</p>
      <section className={styles.hero} aria-labelledby="result-title"><div><span className={styles.eyebrow}>Your move reality</span><h1 id="result-title">{model.title}</h1>
        <p>{model.summary.map((m) => <span key={m.label}>{m.label}: <strong>{m.text}</strong>. </span>)}</p></div>
        <aside className={styles.moveContext}><strong>{model.currentName} <span aria-hidden="true">→</span> {model.destinationName}</strong><span>{model.status}</span><span>Monthly household comparison</span></aside>
      </section>
      <section className={styles.kpis} aria-label="Monthly results">{model.cards.map((card) => <article key={card.label} className={`${styles.kpi} ${card.state === "PARTIAL" ? styles.partial : card.state === "AVAILABLE" ? styles.available : ""} ${card.negative ? styles.negative : ""}`}>
        <h2>{card.label}</h2><strong>{card.text}</strong><small>{card.state === "AVAILABLE" || card.state === "PARTIAL" ? "per month" : card.detail}</small>{card.badge && <span className={styles.badge}>{card.badge}</span>}
      </article>)}</section>
      <p className={styles.notice}><span aria-hidden="true">ⓘ </span>{model.notice} <a href="#coverage">See what’s included →</a></p>
      <nav className={styles.tabs} aria-label="Result sections"><a href="#overview">Overview</a><a href="#breakdown">Cost breakdown</a><a href="#changes">Biggest changes</a><a href="#salary">Salary reality</a><a href="#methodology">How we calculated this</a></nav>
      <section id="overview" className={styles.metricStrip} aria-label="Monthly changes">{model.headlines.map((m) => <div key={m.label}><span>{m.label}</span><strong>{m.text}</strong>{m.state !== "AVAILABLE" && <small>{m.detail}</small>}</div>)}</section>
      <div className={styles.resultGrid}>
        <section id="breakdown" className={styles.panel}><h2>Your monthly costs compared</h2><div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Monthly costs table">
          <table className={styles.table}><caption className={styles.srOnly}>Monthly costs in pounds, by category and location</caption><thead><tr><th scope="col">Category</th><th scope="col">{model.currentName}</th><th scope="col">{model.destinationName}</th><th scope="col">Change</th></tr></thead>
            <tbody>{model.rows.map((row) => <tr key={row.category}><th scope="row">{row.label}</th>
              <td><span>{row.current.text}</span>{row.current.badge && <small>{row.current.badge}</small>}<ExplanationDetails explanation={row.current.explanation} /></td>
              <td><span>{row.destination.text}</span>{row.destination.badge && <small>{row.destination.badge}</small>}<ExplanationDetails explanation={row.destination.explanation} /></td>
              <td className={row.change.tone === "INCREASE" ? styles.increase : row.change.tone === "DECREASE" ? styles.decrease : ""}>{row.change.state === "AVAILABLE" ? row.change.text : "Not comparable"}</td>
            </tr>)}</tbody></table></div></section>
        <aside className={styles.aside}>
          <section id="changes" className={styles.panel}><h2>{model.drivers.title}</h2>
            <ol className={styles.drivers}>{model.drivers.entries.map((d) => <li key={d.category} value={d.rank}><span>{d.rank}. {d.label}</span><div className={styles.bar} aria-hidden="true"><span className={d.direction === "DECREASE" ? styles.savingBar : ""} style={{ width: `${d.width}%` }} /></div><strong>{d.display}</strong></li>)}</ol>
            {model.drivers.entries.length === 0 && <p>No comparable nonzero changes.</p>}
            {model.drivers.unchanged.length > 0 && <details className={styles.details}><summary>Unchanged costs</summary><p>{model.drivers.unchanged.join(", ")}</p></details>}
            {model.drivers.excluded.length > 0 && <div className={styles.exclusions}><strong>Excluded from ranking</strong><ul>{model.drivers.excluded.map((d) => <li key={d.category}>{d.label}: {d.reason}</li>)}</ul></div>}
          </section>
          <section className={`${styles.panel} ${styles.buffer}`}><h2>Your monthly buffer</h2><div className={styles.bufferGrid}>{model.buffers.map((b, i) => <div key={i}><span>{b.label}</span><strong>{b.text}</strong>{b.state !== "AVAILABLE" && <small>{b.detail}</small>}</div>)}</div><p>After the costs included in your result. Savings, debt repayments and other expenses may not be represented.</p></section>
        </aside>
      </div>
      <section id="salary" className={styles.salary}><div><h2>{model.salary.label}</h2><strong className={styles.salaryValue}>{model.salary.text}</strong><p>{model.salary.detail}</p>{model.salary.jurisdiction && <small>Tax jurisdiction: {model.salary.jurisdiction}</small>}</div>
        <div className={styles.salaryFacts}>{model.salary.facts.map((f) => <div key={f.label}><span>{f.label}</span><strong>{f.text}</strong></div>)}</div>
      </section>
      <div className={styles.lowerGrid}><section id="coverage" className={styles.panel}><h2>Cost coverage</h2>{model.coverage.map((c, i) => <div key={i} className={styles.coverage}><strong>{c.label}: {c.text}</strong><p>{c.detail}</p><small>Evidence applicability date: {c.effectiveOn ?? "Not selected"}</small></div>)}
        {model.unresolved.length > 0 && <details open className={styles.details}><summary>What’s missing</summary><ul>{model.unresolved.map((item, i) => <li key={i}><strong>{item.role === "current" ? model.currentName : item.role === "destination" ? model.destinationName : "Comparison"}: </strong>{item.message} {item.userActionPossible && <span>Suggested action: {item.actionLabel} (form not connected yet).</span>}</li>)}</ul></details>}
      </section><section className={styles.panel}><h2>Essentials & lifestyle</h2><p>Lifestyle is shown separately in the breakdown and remains included in the declared budget.</p><p>Coverage describes included categories, not confidence or statistical accuracy.</p><small>Childcare is outside the current eight-category scope.</small></section></div>
      <section id="methodology" className={styles.panel}><h2>Assumptions, methodology & sources</h2><p>{model.periodDisclosure}</p><p>Income uses an annual employment comparison. Cost amounts may be official observations, mathematical monthly equivalents or your entered amounts. Open “Basis & sources” in the table for effective amounts and retained baselines.</p>
        <h3>Take-home calculation sources</h3>{model.cards.slice(0, 2).map((card) => <div key={card.label}><strong>{card.label}</strong><ExplanationDetails explanation={card.explanation} /></div>)}
        <details className={styles.details}><summary>Source release periods</summary><p>Available reference releases; some are retained as background and do not determine your entered amounts.</p><ul>{model.periods.map((p) => <li key={`${p.role}:${p.dataset}`}>{p.role === "current" ? model.currentName : model.destinationName} · {p.label} · {p.period} <small>{p.releaseId}</small></li>)}</ul></details>
      </section>
      <section id="next-actions" className={styles.next}><h2>Next steps</h2><div><div aria-disabled="true"><strong>Adjust your inputs</strong><span>Available when the calculator form is connected</span></div><div aria-disabled="true"><strong>Start a new comparison</strong><span>Available when the calculator form is connected</span></div><a href="#methodology"><strong>Explore the sources →</strong><span>See how these results were calculated</span></a></div></section>
    </main>
  </div>;
}
export function EmptyResults() {
  return <div className={styles.page}><ResultsHeader /><main className={styles.container}><section className={styles.hero}><div><span className={styles.eyebrow}>Your move reality</span><h1>Your comparison starts with your inputs</h1><p>No comparison has been entered in this session. Financial results will appear here once the calculator form is connected.</p><Link className={styles.outlineButton} href="/">Return home</Link></div></section></main></div>;
}
