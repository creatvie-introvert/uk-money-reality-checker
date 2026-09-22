import Link from "next/link";
import styles from "./site-chrome.module.css";

export function PublicFooter() {
  return <footer className={styles.footer}>
    <div className={styles.footerInner}>
      <div className={styles.footerGrid}>
        <div className={styles.footerAbout}>
          <Link href="/" className={styles.brand} aria-label="UK Money Reality home">
            <span className={styles.brandMark} aria-hidden="true">↗</span>
            <span>UK Money<br />Reality<small>MOVE WITH CLARITY</small></span>
          </Link>
          <p>A clearer picture of the household costs, take-home pay and monthly buffer that could change with a move.</p>
        </div>
        <nav aria-label="Explore"><h2>Explore</h2>
          <Link href="/calculator">Calculator</Link><Link href="/cities">Cities</Link>
          <Link href="/methodology">Methodology</Link><Link href="/sources">Sources</Link>
        </nav>
        <nav aria-label="Legal & support"><h2>Legal &amp; support</h2>
          <Link href="/privacy">Privacy</Link><Link href="/accessibility">Accessibility</Link>
        </nav>
      </div>
      <div className={styles.footerBottom}><span>© {new Date().getUTCFullYear()} UK Money Reality</span><p>UK Money Reality is an informational comparison tool, not financial advice. Results depend on your inputs and the evidence available for each category.</p></div>
    </div>
  </footer>;
}
