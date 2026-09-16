"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./public.module.css";

const links = [["/", "Home"], ["/calculator", "Calculator"], ["/cities", "Cities"], ["/methodology", "Methodology"], ["/sources", "Sources"]] as const;

export function PublicHeader() {
  const pathname = usePathname();
  return <header className={styles.header}>
    <div className={styles.headerInner}>
      <Link href="/" className={styles.brand} aria-label="UK Money Reality home">UK Money Reality<small>REAL NUMBERS. BRIGHTER DECISIONS.</small></Link>
      <nav aria-label="Main navigation">
        {links.map(([href, label]) => <Link key={href} href={href}
          aria-current={pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) ? "page" : undefined}
          className={href === "/calculator" ? styles.navCalculator : undefined}>{label}</Link>)}
      </nav>
    </div>
  </header>;
}
