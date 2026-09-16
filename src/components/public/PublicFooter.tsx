import Link from "next/link";
import styles from "./public.module.css";

export function PublicFooter() {
  return <footer className={styles.footer}>
    <div className={styles.footerInner}>
      <div><Link href="/" className={styles.footerBrand}>UK Money Reality</Link><p>A clearer picture of the household costs, take-home pay and monthly buffer that could change with a move.</p></div>
      <nav aria-label="Footer navigation">
        <Link href="/calculator">Calculator</Link><Link href="/cities">Cities</Link>
        <Link href="/methodology">Methodology</Link><Link href="/sources">Sources</Link>
        <Link href="/privacy">Privacy</Link><Link href="/accessibility">Accessibility</Link>
      </nav>
      <div className={styles.footerBottom}><span>© {new Date().getUTCFullYear()} UK Money Reality</span><p>UK Money Reality is an informational comparison tool, not financial advice. Results depend on your inputs and the evidence available for each category.</p></div>
    </div>
  </footer>;
}
