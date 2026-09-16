import type { Metadata } from "next";
import Link from "next/link";
import { cityDefinitions } from "@/product/cities/registry";
import styles from "@/components/cities/cities.module.css";
import publicStyles from "@/components/public/public.module.css";

export const metadata: Metadata = {
  title: "Supported cities and living-cost evidence | UK Money Reality",
  description: "Explore evidence coverage, source periods and known gaps for the eight UK cities supported by UK Money Reality, then compare your own move.",
};
export default function CitiesPage() {
  return <>
    <section className={styles.hero}><div className={styles.heroInner}>
      <p className={publicStyles.eyebrow}>Places you can compare</p>
      <h1>Supported UK cities</h1>
      <p>UK Money Reality currently supports eight UK cities. Coverage varies by category, and some values still require your own household inputs.</p>
      <p>Explore the evidence behind each location before building your comparison.</p>
      <Link href="/calculator" className={publicStyles.primary}>Compare your move</Link>
    </div></section>
    <section className={styles.content} aria-label="Eight supported cities">
      <ul className={styles.cards}>{cityDefinitions.map((city) => <li key={city.slug}><article className={styles.card} aria-labelledby={`${city.slug}-title`}>
        <p className={styles.nation}>{city.nation}</p><h2 id={`${city.slug}-title`}>{city.displayName}</h2>
        <p>{city.summary}</p>
        <div className={styles.cardActions}><Link href={`/cities/${city.slug}`}>Explore {city.displayName} <span aria-hidden="true"> →</span></Link><Link href="/calculator" aria-label={`Compare a move involving ${city.displayName}`}>Compare a move</Link></div>
      </article></li>)}</ul>
      <p className={styles.intro}>Published evidence has a particular geography, period and purpose. Availability does not mean a category resolves to one household amount.</p>
    </section>
  </>;
}
