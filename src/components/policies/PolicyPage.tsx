import Link from "next/link";
import { policyReviewDate, projectIssuesUrl, type PolicySection } from "@/product/policies/content";
import styles from "@/components/transparency/transparency.module.css";
import publicStyles from "@/components/public/public.module.css";
export function PolicyPage({ title, introduction, sections }: { title: string; introduction: string; sections: readonly PolicySection[] }) {
  return <>
    <section className={styles.hero}><div className={styles.heroInner}><p className={publicStyles.eyebrow}>Using UK Money Reality</p><h1>{title}</h1><p>{introduction}</p><p>Prepared and reviewed: <time dateTime="2026-09-16">{policyReviewDate}</time></p></div></section>
    <div className={styles.layout}>
      <nav className={styles.toc} aria-label={`${title} contents`}><h2>On this page</h2><ul>{sections.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}</ul></nav>
      <div className={styles.article}>{sections.map((s) => <section className={styles.section} id={s.id} key={s.id}><h2>{s.title}</h2>{s.paragraphs.map((p) => <p key={p}>{p}</p>)}
        {["contact", "report"].includes(s.id) && <p><a href={projectIssuesUrl}>Project issue tracker (public)</a></p>}
      </section>)}<div className={styles.footerLinks}><Link href="/methodology">Methodology</Link><Link href="/sources">Data sources</Link><Link href="/calculator">Start a comparison</Link></div></div>
    </div>
  </>;
}
