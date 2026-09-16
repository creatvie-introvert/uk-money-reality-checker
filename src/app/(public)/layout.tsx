import type { ReactNode } from "react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import styles from "@/components/public/public.module.css";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <div className={styles.site}>
    <a className={styles.skip} href="#public-main">Skip to main content</a>
    <PublicHeader />
    <main id="public-main" tabIndex={-1}>{children}</main>
    <PublicFooter />
  </div>;
}
