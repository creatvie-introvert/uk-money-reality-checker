import Link from "next/link";
import styles from "./public.module.css";

export function PublicFooter() {
  return <footer className={styles.footer}>
    <div className={styles.footerInner}>
      <div><Link href="/" className={styles.footerBrand}>UK Money Reality</Link><p>A clearer picture of the household costs, take-home pay and monthly buffer that could change with a move.</p></div>
      <nav aria-label="Footer navigation">
        <Link href="/calculator">Calculator</Link><Link href="/cities">Cities</Link>
        <Link href="/methodology">Methodology</Link><Link href="/sources">Sources</Link>
      </nav>
      <div className={styles.footerBottom}><span>© {new Date().getUTCFullYear()} UK Money Reality</span><p>Published evidence where suitable. Your own amounts where needed. Missing values stay visible.</p></div>
    </div>
  </footer>;
}
