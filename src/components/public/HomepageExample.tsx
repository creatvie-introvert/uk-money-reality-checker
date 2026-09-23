import "server-only";
import Link from "next/link";
import { buildHomepageExample } from "@/product/homepage/example";
import { sourcePeriodText } from "@/product/transparency/periods";
import styles from "./homepage.module.css";

export function HomepageExample() {
  const { form, product, view, salaries, enteredRows, evidence } = buildHomepageExample();
  const labels = ["Change in monthly outgoings", "Change in monthly take-home", "Change in monthly buffer"];
  return <section className={`${styles.section} ${styles.example}`} id="example" aria-labelledby="example-title">
    <div className={styles.wrap}>
      <div className={styles["example-heading"]}>
        <div><span className={styles.eyebrow}>See an example result</span><h2 id="example-title">What could change between Manchester and Leeds?</h2><p>This completed comparison uses a defined household and published evidence alongside entered costs. It is not a typical saving, forecast or recommendation for your move.</p></div>
        <Link className={`${styles.btn} ${styles["btn-primary"]}`} href="/calculator">See what changes for your household <span aria-hidden="true">→</span></Link>
      </div>
      <div className={styles["example-shell"]}>
        <div className={styles["example-top"]}>
          <div className={styles["example-route"]}><span><small>CURRENT CITY</small><strong>{product.current.name}</strong></span><span aria-hidden="true" className={styles["route-arrow"]}>→</span><span><small>DESTINATION</small><strong>{product.destination.name}</strong></span></div>
          <span className={styles["example-label"]}>ILLUSTRATIVE HOUSEHOLD · {view.status.toUpperCase()}<br /><time dateTime={form.current.effectiveOn}>{sourcePeriodText(form.current.effectiveOn)}</time></span>
        </div>
        <div className={styles["example-grid"]}>{view.headlines.map((metric, index) => <div key={metric.label} className={`${styles["example-result"]} ${index === 2 ? styles["example-emphasis"] : ""}`}>
          <span className={styles["example-kicker"]}>{labels[index]}</span><strong>{metric.text.replace("/month", "")}</strong><span>{metric.detail} per month · Calculated</span>
        </div>)}</div>
        <div className={styles["example-meta"]}>
          <p><strong>The household behind these figures:</strong> {form.household.adults} adult, no children, {form.current.bedrooms} bedrooms in each city, annual gross salary {salaries[0]} → {salaries[1]}. Published rent period: {sourcePeriodText(form.current.rentSourceMonth)}; selected evidence applicability date: <time dateTime={form.current.effectiveOn}>{sourcePeriodText(form.current.effectiveOn)}</time>.</p>
          <details><summary>View the complete example inputs and limitations</summary><div className={styles["example-details"]}>
            <p><strong>Rent:</strong> published rent for the selected bedroom category and local-authority geography. <strong>Council tax:</strong> Manchester Band D and Leeds Band D, using the applicable published annual authority charge divided by twelve.</p>
            <p>The one-adult scenario receives <strong>no automatic single-person council-tax discount</strong>. Discounts, exemptions, address-specific applicability and actual instalment schedules are outside this calculation.</p>
            <p><strong>Take-home pay:</strong> rest-of-UK (England, Wales and Northern Ireland) {form.current.income.taxYear} rules; one employee, one employment, Class 1 category A National Insurance and an annual comparison. No take-home overrides. Pensions, student loans and other excluded payroll deductions are not included. Actual payroll take-home may differ.</p>
            <table className={styles["example-inputs"]}><caption>Declared monthly spending assumptions — Your amount</caption><thead><tr><th scope="col">Monthly entered costs</th><th scope="col">Manchester</th><th scope="col">Leeds</th></tr></thead><tbody>{enteredRows.map((row) => <tr key={row.category}><th scope="row">{row.label}</th><td>{row.current.display}</td><td>{row.destination.display}</td></tr>)}</tbody></table>
            <p>Groceries, household essentials, energy, water, transport and lifestyle are declared scenario inputs, <strong>not official city averages</strong>.</p>
            <p>This example resolves all eight included cost categories. It is not necessarily a complete household budget: childcare, debt repayments and other costs may still apply. Published rents describe the selected source geography and observation period; they are not quotes for particular properties.</p>
            <p>Source observation periods, effective dates and the scenario applicability date are different concepts. The applicability date selects eligible evidence; it is not a moving date or a claim that every source was published that day.</p>
            <div className={styles["example-sources"]}>{evidence.map((side) => <div key={side.name}><h3>{side.name}: basis and sources</h3>{[...side.categories, { label: "Take-home pay", explanation: side.income }].map(({ label, explanation }) => <div key={label}>
              <h4>{label} · {explanation.label}</h4><p>{explanation.summary}</p>
              <ul>{explanation.sources.map((source) => <li key={source.id}><strong>{source.organisation}</strong> — {source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} (opens in new tab)</a> : source.title}<br />{source.geography && <>{source.geography} · </>}{sourcePeriodText(source.period ?? "Period not supplied")}{(source.effectiveFrom || source.effectiveTo) && <> · Effective: {sourcePeriodText(source.effectiveFrom ?? "not specified")} to {sourcePeriodText(source.effectiveTo ?? "not specified")}</>}</li>)}</ul>
              {explanation.limitations.length > 0 && <ul>{explanation.limitations.map((limit) => <li key={limit}>{limit}</li>)}</ul>}
            </div>)}</div>)}</div>
          </div></details>
        </div>
      </div>
      <div className={styles["example-after"]}><div><h3>Your move won’t look exactly like this.</h3><p>Choose your own cities and amounts to see how the numbers change for your household.</p></div><Link className={`${styles.btn} ${styles["btn-primary"]}`} href="/calculator">Compare your move <span aria-hidden="true">→</span></Link></div>
    </div>
  </section>;
}
