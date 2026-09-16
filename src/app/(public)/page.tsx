import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/public/public.module.css";

export const metadata: Metadata = {
  title: "UK Money Reality — Compare the financial impact of moving in the UK",
  description: "Compare household costs, take-home pay and monthly financial buffer across supported UK cities using published evidence and your own household amounts.",
};

const cities = ["London", "Birmingham", "Manchester", "Leeds", "Liverpool", "Bristol", "Edinburgh", "Glasgow"];
const principles = [
  ["Official UK evidence", "Published UK data is used where it can suitably represent the cost you’re comparing."],
  ["Your actual household amounts", "Enter your own costs where published evidence cannot truthfully represent your household."],
  ["Missing stays missing", "Unknown or unsupported values are not silently turned into £0. A result can be partial."],
  ["Transparent sources", "See which values are official data, calculated values or your own entered amounts."],
];

export default function HomePage() {
  return <>
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>UK relocation, grounded in evidence</p>
          <h1 id="home-title">See what a move could really mean for your monthly money</h1>
          <p className={styles.lead}>Compare household costs, take-home pay and the monthly buffer left after the costs included in the calculator.</p>
          <div className={styles.actions}><Link href="/calculator" className={styles.primary}>Compare your move <span aria-hidden="true">→</span></Link><Link href="/cities" className={styles.secondary}>Explore supported cities</Link></div>
          <p className={styles.heroNote}>Your household. Your inputs. A comparison with its limits in view.</p>
        </div>
        <aside className={styles.moveIllustration} aria-label="What your comparison brings together">
          <p className={styles.eyebrow}>A move is more than a rent change</p>
          <div className={styles.locationPair}><span>Where you live now</span><span aria-hidden="true">→</span><span>Where you’re moving</span></div>
          <ul className={styles.comparisonRows}>
            <li><span className={styles.motif} aria-hidden="true">↔</span><div><strong>Household costs</strong><span>What changes in your included costs</span></div></li>
            <li><span className={styles.motif} aria-hidden="true">↔</span><div><strong>Take-home pay</strong><span>Income after supported tax and NI calculations, or your actual amount</span></div></li>
            <li><span className={styles.motif} aria-hidden="true">↔</span><div><strong>Monthly buffer</strong><span>What remains after the costs included</span></div></li>
          </ul>
          <p className={styles.illustrationNote}>Your inputs and published evidence, explained together.</p>
        </aside>
      </div>
    </section>

    <section className={styles.section} aria-labelledby="principles-title">
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>A useful comparison starts with honesty</p><h2 id="principles-title">Real evidence. Room for your reality.</h2><p>Published figures are a starting point, not a complete picture of every household.</p></div>
      <div className={styles.principles}>{principles.map(([title, text]) => <article key={title}><span className={styles.smallRule} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>

    <section className={styles.how} aria-labelledby="how-title"><div className={styles.section}>
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>How it works</p><h2 id="how-title">From a possible move to a clearer picture</h2></div>
      <ol className={styles.steps}>
        <li><span aria-hidden="true">01</span><h3>Tell us about the move</h3><p>Choose where you live now and where you’re considering moving. Each location keeps its own details.</p></li>
        <li><span aria-hidden="true">02</span><h3>Add the household and money details</h3><p>Enter your housing, income and household costs. Review your choices before you calculate.</p></li>
        <li><span aria-hidden="true">03</span><h3>See what changes</h3><p>Compare monthly costs, take-home pay and buffer, and see the biggest cost drivers. Where eligible, see the salary needed to preserve the same monthly buffer.</p></li>
      </ol>
    </div></section>

    <section className={styles.section} aria-labelledby="cities-title">
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>Places you can compare</p><h2 id="cities-title">Eight cities. Your own circumstances.</h2><p>These cities are supported by the calculator. Published evidence varies by category and location; your own amounts can fill supported gaps.</p></div>
      <ul className={styles.cityGrid}>{cities.map((city) => <li key={city}><Link href="/cities">{city}<span aria-hidden="true">↗</span></Link></li>)}</ul>
      <p className={styles.supporting}>Individual city pages are being prepared. These links take you to the city-page update.</p>
    </section>

    <section className={styles.transparency} aria-labelledby="transparency-title">
      <div><p className={styles.eyebrow}>The context belongs with the numbers</p><h2 id="transparency-title">Built to show its workings</h2><p>Source and effective periods differ by category. Not every cost has one official city-level figure that describes your household.</p><p>Inspect sources and assumptions in your results. When the evidence or your inputs are incomplete, the calculator can return a partial result rather than guess.</p><Link href="/methodology" className={styles.textLink}>Read the methodology <span aria-hidden="true">→</span></Link><p className={styles.supporting}>The public methodology page is being prepared. Source explanations are already available in calculator results.</p></div>
      <div className={styles.evidenceCard}><h3>Know what each value represents</h3><dl><div><dt>Official data</dt><dd>Published evidence suitable for the selected inputs.</dd></div><div><dt>Calculated</dt><dd>A calculation from supported inputs and evidence.</dd></div><div><dt>Your amount</dt><dd>An amount you entered for your household.</dd></div></dl><Link href="/sources" className={styles.textLink}>About the sources page <span aria-hidden="true">→</span></Link></div>
    </section>

    <section className={styles.finalCta} aria-labelledby="start-title"><div><h2 id="start-title">Ready to compare your move?</h2><p>Start with what you know. See which details still need your input.</p></div><Link href="/calculator" className={styles.primary}>Start the calculator <span aria-hidden="true">→</span></Link></section>
  </>;
}
