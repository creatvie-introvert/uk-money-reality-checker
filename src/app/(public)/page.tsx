import type { Metadata } from "next";
import { cityDefinitions } from "@/product/cities/registry";
import Link from "next/link";
import Image from "next/image";
import { cityPhotography, cityPhotographSizes } from "@/product/homepage/city-photography";
import { HomepageExample } from "@/components/public/HomepageExample";
import styles from "@/components/public/homepage.module.css";

export const metadata: Metadata = {
  title: "UK Money Reality — Compare the financial impact of moving in the UK",
  description: "Compare household costs, take-home pay and monthly financial buffer across supported UK cities using published evidence and your own household amounts.",
};

export default function HomePage() {
  return <div className={styles.home}>
<section className={styles["hero"]} id="hero" aria-labelledby="hero-title">
<div className={styles["wrap"] + " " + styles["hero-grid"]}>
<div>
<div className={styles["eyebrow"]}>Your move, your numbers</div>
<h1 id="hero-title">See what a move could mean for your <em>monthly money.</em>
</h1>
<p>Compare household costs, take-home pay and what you could have left each month. Start with published UK evidence, then add the figures that reflect your household.</p>
<div className={styles["actions"]}>
<Link className={styles["btn"] + " " + styles["btn-primary"]} href="/calculator">Compare your move <span aria-hidden="true">↗</span>
</Link>
<Link className={styles["btn"] + " " + styles["btn-secondary"]} href="#how">See how it works <span aria-hidden="true">↓</span>
</Link>
</div>
<div className={styles["micro"]}>
<span>Eight UK cities</span>
<span>No account needed</span>
<span>Sources and gaps shown clearly</span>
</div>
</div>
<div className={styles["mock-shell"]} id="calculator-preview">
<div aria-hidden="true" className={styles["orbit"]}>
</div>
<div className={styles["mock"]} aria-hidden="true">
<div className={styles["mock-top"]}>
<span className={styles["mock-brand"]}>Your move, in focus.</span>
<span className={styles["pill"]}>PRODUCT PREVIEW</span>
</div>
<div className={styles["mock-inner"]}>
<div className={styles["locations"]}>
<div className={styles["location"]}>
<small>CURRENT CITY</small>
<b>Current city</b>
</div>
<span aria-hidden="true" className={styles["arrow"]}>→</span>
<div className={styles["location"]}>
<small>NEXT UP</small>
<b>Next city</b>
</div>
</div>
<div className={styles["mock-title"]}>What your results could show</div>
<div className={styles["signal"]}>
<span aria-hidden="true" className={styles["icon-b"]}>⌂</span>
<div>
<strong>Household outgoings</strong>
<small>Rent, bills and everyday spending</small>
</div>
<span aria-hidden="true" className={styles["rail"]}>
<i>
</i>
</span>
</div>
<div className={styles["signal"]}>
<span aria-hidden="true" className={styles["icon-b"]}>£</span>
<div>
<strong>Take-home pay</strong>
<small>Income after tax and NI</small>
</div>
<span aria-hidden="true" className={styles["rail"]}>
<i>
</i>
</span>
</div>
<div className={styles["signal"]}>
<span aria-hidden="true" className={styles["icon-b"]}>↗</span>
<div>
<strong>Monthly buffer</strong>
<small>What remains after included costs</small>
</div>
<span aria-hidden="true" className={styles["rail"]}>
<i>
</i>
</span>
</div>
</div>
<div className={styles["mock-bottom"]}>
<strong>Clarity over guesswork.</strong>
<span>Evidence + your numbers</span>
</div>
</div>
<p className={styles["mock-note"]}>Illustrative product preview: no personal amounts or outcomes have been calculated.</p>
</div>
</div>
</section>
<HomepageExample />
<section className={styles["section"] + " " + styles["steps"]} id="how" aria-labelledby="how-title">
<div className={styles["wrap"]}>
<div className={styles["section-intro"]}>
<span className={styles["eyebrow"]}>Three clear steps</span>
<h2 id="how-title">Three steps to a clearer picture.</h2>
<p>Choose your cities, add your household details and see what could change. You can go back and update your answers whenever you need to.</p>
</div>
<ol role="list" className={styles["steps-grid"]}>
<li className={styles["step"]}>
<span className={styles["step-num"]}>01 / CHOOSE</span>
<div aria-hidden="true" className={styles["step-art"]}>
<span className={styles["art-chip"]}>Current city</span>→<span className={styles["art-chip"]}>Next city</span>
</div>
<h3>Choose your cities</h3>
<p>Compare two of our eight supported cities, or explore changes within the same city.</p>
</li>
<li className={styles["step"]}>
<span className={styles["step-num"]}>02 / PERSONALISE</span>
<div aria-hidden="true" className={styles["step-art"]}>
<span className={styles["art-chip"]}>£ Income</span>
<span className={styles["art-chip"]}>⌂ Outgoings</span>
</div>
<h3>Add your household details</h3>
<p>Enter your income, housing details and everyday costs. Use published figures where supported and your own amounts where needed.</p>
</li>
<li className={styles["step"]}>
<span className={styles["step-num"]}>03 / UNDERSTAND</span>
<div aria-hidden="true" className={styles["step-art"]}>
<span className={styles["art-line"]}>
</span>
<span className={styles["art-line"]} style={{ width: 56, background: "var(--ukmr-color-positive)" }}>
</span>
<span className={styles["art-line"]} style={{ width: 28, background: "var(--ukmr-color-focus)" }}>
</span>
</div>
<h3>See what changes</h3>
<p>Explore your monthly costs, take-home pay and buffer, with sources and missing information clearly identified. Where supported, see the salary needed to preserve the same monthly buffer.</p>
</li>
</ol>
</div>
</section>
<section className={styles["section"] + " " + styles["cities"]} id="cities" aria-labelledby="cities-title">
<div className={styles["wrap"]}>
<div className={styles["cities-top"]}>
<div className={styles["section-intro"]}>
<span className={styles["eyebrow"]}>Explore the UK</span>
<h2 id="cities-title">Eight cities. Your next chapter.</h2>
<p>Explore the evidence available for each location before building a household comparison.</p>
</div>
<Link className={styles["btn"] + " " + styles["btn-secondary"]} href="/calculator">Start a comparison ↗</Link>
</div>
<ul role="list" className={styles["city-grid"]}>{cityDefinitions.map((city) => <li key={city.slug}>
<Link className={styles.city} href={`/cities/${city.slug}`} aria-label={city.displayName}>
  <Image
    className={styles["city-photo"]}
    src={cityPhotography[city.slug].localFilename}
    alt=""
    fill
    sizes={cityPhotographSizes(cityPhotography[city.slug])}
    loading="lazy"
    style={{ objectPosition: cityPhotography[city.slug].objectPosition }}
  />
  <span className={styles["city-name"]}>{city.displayName}</span>
<span className={styles["city-meta"]}>{city.slug === "london" ? "Regional rent evidence" : city.slug === "edinburgh" ? "Exact published rent row unavailable" : city.slug === "glasgow" ? "Greater Glasgow rent geography" : "Explore available evidence"}</span>
<span aria-hidden="true" className={styles["city-arrow"]}>↗</span>
</Link>
</li>)}</ul>
<p className={styles["cities-foot"]}>Evidence coverage varies by category and geography. Explore each city’s published sources and limitations before comparing your household.</p>
<details className={styles["photo-credits"]} id="city-photo-credits">
  <summary>City photo credits and licences</summary>
  <p>City photography is illustrative and is not financial evidence.</p>
  <ul>{cityDefinitions.map((city) => {
    const photo = cityPhotography[city.slug];
    return <li key={city.slug}>
      <strong>{city.displayName}:</strong> {photo.imageTitle} — {photo.creatorUrl
        ? <a href={photo.creatorUrl} target="_blank" rel="noopener noreferrer">{photo.creator} (opens in new tab)</a>
        : photo.creator}.{" "}
      <a href={photo.sourcePageUrl} target="_blank" rel="noopener noreferrer">Image source (opens in new tab)</a>.{" "}
      <a href={photo.licenceUrl} target="_blank" rel="noopener noreferrer">{photo.licence} (opens in new tab)</a>.{" "}
      {photo.previousModifications.join(" ")} {photo.modificationNote}{" "}
      {photo.licence.includes("BY-SA") && <>Photographic adaptation shared under {photo.licence}. </>}
      {city.slug === "glasgow" && <>Public-domain dedication; credit retained for provenance.</>}
    </li>;
  })}</ul>
</details>
</div>
</section>
<section className={styles["section"] + " " + styles["method-context"]} id="evidence-context" aria-labelledby="evidence-context-title">
<div className={styles["wrap"]}>
<div className={styles["context-panel"]}>
<div className={styles["context-copy"]}>
<span className={styles["eyebrow"]}>Understand your results</span>
<h2 id="evidence-context-title">Know where your numbers come from.</h2>
<p>You can inspect the published sources, dates and locations behind a figure, see which amounts you entered and spot any gaps in your comparison.</p>
<div className={styles["context-links"]}>
<Link className={styles["text-link"]} href="/methodology">Read the methodology <span aria-hidden="true">→</span>
</Link>
<Link className={styles["text-link"]} href="/sources">Explore the data sources <span aria-hidden="true">→</span>
</Link>
</div>
</div>
<aside aria-label="What you will see in your results" className={styles["context-card"]}>
<h3>What you’ll see in your results</h3>
<div className={styles["context-list"]}>
<div className={styles["context-item"]}>
<strong>Official data</strong>
<p>Published figures, with their source, geography and period.</p>
</div>
<div className={styles["context-item"]}>
<strong>Calculated</strong>
<p>Amounts worked out from supported evidence and your inputs.</p>
</div>
<div className={styles["context-item"]}>
<strong>Your amount</strong>
<p>Costs and take-home figures you entered yourself.</p>
</div>
<div className={styles["context-item"]}>
<strong>Missing information</strong>
<p>Gaps stay visible. An unknown amount is not an explicit £0. If a comparison is incomplete, we say so.</p>
</div>
</div>
</aside>
</div>
</div>
</section>
<section className={styles["section"] + " " + styles["faq"]} id="faq" aria-labelledby="faq-title">
<div className={styles["wrap"] + " " + styles["faq-grid"]}>
<div className={styles["faq-heading"]}>
<span className={styles["eyebrow"]}>Before you begin</span>
<h2 id="faq-title">Questions before you start?</h2>
<p>The calculator is here to help you explore a decision, not give you a one-size-fits-all answer.</p>
<Link className={styles["text-link"]} href="/calculator">Start your comparison <span aria-hidden="true">→</span>
</Link>
</div>
<div className={styles["faq-list"]}>
<details>
<summary>How recent is the data?<span aria-hidden="true" className={styles["faq-plus"]}>+</span>
</summary>
<p>Different sources cover different periods. We show the source, geography and relevant dates alongside the figures used in your comparison.</p>
</details>
<details>
<summary>What if I don’t know one of my costs?<span aria-hidden="true" className={styles["faq-plus"]}>+</span>
</summary>
<p>You can leave optional costs unknown. If missing information prevents a complete comparison, your results explain what is unresolved rather than filling it with a guess.</p>
</details>
<details>
<summary>Can I compare more than one move?<span aria-hidden="true" className={styles["faq-plus"]}>+</span>
</summary>
<p>Yes. You can start another comparison, but this version of the calculator does not save a history of earlier comparisons.</p>
</details>
<details>
<summary>Is this my complete household budget?<span aria-hidden="true" className={styles["faq-plus"]}>+</span>
</summary>
<p>Not necessarily. Results cover the categories included in your comparison. Other expenses—such as childcare or debt repayments—may not be represented.</p>
</details>
</div>
</div>
</section>
<section className={styles["bottom-cta"]} id="start" aria-labelledby="start-title">
<div className={styles["wrap"] + " " + styles["cta-inner"]}>
<div>
<span className={styles["eyebrow"]}>Start with your household</span>
<h2 id="start-title">Ready to see what could change?</h2>
<p>Choose your cities, add your household details and explore your results.</p>
</div>
<Link className={styles["btn"] + " " + styles["btn-primary"]} href="/calculator">Compare your move ↗</Link>
</div>
</section>
</div>;
}
