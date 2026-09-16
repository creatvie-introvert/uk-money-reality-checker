import type { Metadata } from "next";
import Link from "next/link";
import { costMethods, methodSections } from "@/product/transparency/methodology";
import { ClassificationLegend } from "@/components/transparency/Provenance";
import styles from "@/components/transparency/transparency.module.css";
import publicStyles from "@/components/public/public.module.css";

export const metadata: Metadata = {
  title: "Methodology | UK Money Reality",
  description: "See how UK Money Reality compares household costs, take-home pay, monthly buffer and salary preservation, including how partial results and user-entered amounts are handled.",
};
const navigation = [
  ["comparison", "The comparison"], ["costs", "Included costs"], ["income", "Take-home and tax"], ["salary", "Salary preservation"],
  ["partial", "Partial results"], ["coverage", "Coverage"], ["classifications", "Classifications and evidence"],
  ["overrides", "Your amounts"], ["periods", "Dates and geography"], ["rounding", "Rounding"], ["scope", "Current scope"],
];
export default function MethodologyPage() {
  return <>
    <section className={styles.hero}><div className={styles.heroInner}><p className={publicStyles.eyebrow}>Understand your comparison</p><h1>Methodology</h1><p>How household costs, take-home pay and your monthly buffer fit together — with the evidence, your inputs and the limits in view.</p><Link href="/sources" className={publicStyles.textLink}>Explore the data sources →</Link></div></section>
    <div className={styles.layout}>
      <nav className={styles.toc} aria-label="Methodology contents"><h2>On this page</h2><ul>{navigation.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ul></nav>
      <div className={styles.article}>
        <section id="comparison" className={styles.section}><h2>What the calculator compares</h2><p>Compare your current and destination scenarios across the same eight household cost categories, alongside supported take-home income. Changes are destination minus current.</p>
          <div className={styles.equation}><span>Monthly take-home income</span><span>− included monthly household costs</span><span>= monthly buffer</span></div>
          <p>Monthly buffer means the amount left after the cost categories included in the calculator. It is not savings, free cash after every possible expense, disposable income in a full financial-planning sense, or an affordability score.</p>
        </section>
        <section id="costs" className={styles.section}><h2>The eight included cost categories</h2><p>Evidence is used only where its scope matches the supported inputs. A city does not automatically supply every household cost.</p>{costMethods.map((category) => <section key={category.id} aria-labelledby={`method-${category.id}`}><h3 id={`method-${category.id}`}>{category.title}</h3><p><span className={styles.badge}>{category.basis}</span></p>{category.paragraphs.map((p) => <p key={p}>{p}</p>)}</section>)}</section>
        {methodSections.map((section) => <section key={section.id} id={section.id} className={styles.section}><h2>{section.title}</h2>{section.paragraphs.map((p) => <p key={p}>{p}</p>)}
          {section.id === "coverage" && <section id="classifications" aria-labelledby="classifications-title"><h3 id="classifications-title">Classifications and approved evidence</h3><ClassificationLegend /><div className={styles.note}><p>Only evidence approved for public use can feed public calculations. Development-only or blocked evidence is excluded. Reference-only evidence can inform context without powering a personalised result; published tax and NI reference rules can be inputs to a supported deterministic calculation.</p><p>The result’s source explanation identifies what was actually used. An evidence classification is separate from whether that evidence is suitable for your selected circumstances.</p></div></section>}
        </section>)}
        <div className={styles.footerLinks}><Link href="/calculator" className={publicStyles.primary}>Compare your move</Link><Link href="/sources" className={publicStyles.secondary}>Explore data sources</Link><Link href="/" className={publicStyles.textLink}>Back to home</Link></div>
      </div>
    </div>
  </>;
}
