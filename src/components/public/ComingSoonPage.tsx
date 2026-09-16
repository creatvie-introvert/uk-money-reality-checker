import Link from "next/link";
import styles from "./public.module.css";

export function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return <section className={styles.placeholder} aria-labelledby="page-title">
    <p className={styles.eyebrow}>Public pages · In preparation</p>
    <h1 id="page-title">{title}</h1>
    <p className={styles.lead}>{description}</p>
    <div className={styles.preparationNotice}><h2>This page is not complete yet</h2><p>We’re preparing this content as part of the UK Money Reality rebuild. This is a temporary page, not a published guide or source register.</p></div>
    <p>You can use the calculator now and inspect the source explanations, assumptions and unresolved costs alongside your results.</p>
    <div className={styles.actions}><Link href="/calculator" className={styles.primary}>Compare your move <span aria-hidden="true">→</span></Link><Link href="/" className={styles.secondary}>Back to home</Link></div>
  </section>;
}
