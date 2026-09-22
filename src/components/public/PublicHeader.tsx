"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./site-chrome.module.css";

const links = [["/", "Home"], ["/cities", "Cities"], ["/methodology", "Methodology"], ["/sources", "Sources"], ["/calculator", "Calculator"]] as const;

type Props = { calculator?: boolean; results?: boolean; onRestart?: () => void };

export function PublicHeader({ calculator = false, results = false, onRestart }: Props) {
  const pathname = usePathname();
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const open = expandedPath === pathname;
  const navigationId = useId();
  const header = useRef<HTMLElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<EventTarget | null>(null);

  useEffect(() => {
    // Keep this query aligned with the shared header's CSS breakpoint.
    const mobile = window.matchMedia("(max-width: 700px)");
    const resize = () => {
      if (mobile.matches && (navigation.current?.contains(document.activeElement) ||
        (lastFocused.current instanceof Node && navigation.current?.contains(lastFocused.current)))) toggle.current?.focus();
      if (!mobile.matches && (document.activeElement === toggle.current || lastFocused.current === toggle.current)) navigation.current?.querySelector("a")?.focus();
      setExpandedPath(null);
    };
    mobile.addEventListener("change", resize);
    return () => mobile.removeEventListener("change", resize);
  }, []);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !header.current?.contains(event.target)) {
        if (navigation.current?.contains(document.activeElement)) toggle.current?.focus();
        lastFocused.current = null;
        setExpandedPath(null);
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  return <header ref={header} className={styles.header}
    onFocusCapture={(event) => { lastFocused.current = event.target; }}
    onBlur={(event) => {
      // Safari can blur a button to null on pointer-down before a link click.
      // Closing there would hide the link before its activation. Outside pointer
      // events handle that case; a real focus destination handles keyboard exit.
      if (event.relatedTarget) {
        lastFocused.current = event.relatedTarget;
        if (!event.currentTarget.contains(event.relatedTarget)) setExpandedPath(null);
      }
    }}
    onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        event.preventDefault(); setExpandedPath(null); toggle.current?.focus();
      }
    }}>
    <div className={styles.headerInner}>
      <Link href="/" className={styles.brand} aria-label="UK Money Reality home" onClick={() => setExpandedPath(null)}>
        <span className={styles.brandMark} aria-hidden="true">↗</span>
        <span>UK Money<br />Reality<small>MOVE WITH CLARITY</small></span>
      </Link>
      <button ref={toggle} type="button" className={styles.menuButton} aria-expanded={open} aria-controls={navigationId}
        onClick={() => setExpandedPath(open ? null : pathname)}>
        <span aria-hidden="true">{open ? "×" : "☰"}</span> {open ? "Close menu" : "Menu"}
      </button>
      <nav ref={navigation} id={navigationId} className={styles.navigation} data-open={open} aria-label="Main navigation">
        {links.map(([href, label]) => <Link key={href} href={href} onClick={() => setExpandedPath(null)}
          aria-current={pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) ? "page" : undefined}
          className={href === "/calculator" ? styles.navCalculator : undefined}>{label}</Link>)}
      </nav>
      {calculator && <div className={styles.contextActions}>
        {results && <><a href="#breakdown">Compare</a><a href="#methodology">How it works</a></>}
        {onRestart ? <button type="button" className={styles.restart} onClick={() => { setExpandedPath(null); onRestart(); }}>New comparison</button>
          : <Link href="/calculator" className={styles.restart}>New comparison</Link>}
      </div>}
    </div>
  </header>;
}
