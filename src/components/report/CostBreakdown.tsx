"use client";

import { useId, useState } from "react";
import type { ResultsViewModel } from "@/product/calculator/view-model";
import { ExplanationContent } from "./SourceExplanation";
import styles from "./results.module.css";

type Props = Pick<ResultsViewModel, "rows" | "currentName" | "destinationName">;
type Side = "current" | "destination";
const sides: Side[] = ["current", "destination"];

function CostRows({ row, currentName, destinationName }: Omit<Props, "rows"> & { row: Props["rows"][number] }) {
  const [open, setOpen] = useState<Side | null>(null);
  const id = useId();
  const name = (side: Side) => side === "current" ? currentName : destinationName;
  const context = (side: Side) => `${side === "current" ? "Current" : "Destination"} · ${name(side)}`;
  return <>
    <tr role="row" className={styles.costRow}>
      <th role="rowheader" scope="row">{row.label}</th>
      {sides.map((side) => <td role="cell" key={side}>
        <span className={styles.mobileLabel} aria-hidden="true">{context(side)}</span>
        <span>{row[side].text}</span>{row[side].badge && <small>{row[side].badge}</small>}
        <button type="button" className={styles.sourceTrigger}
          aria-label={`Basis & sources: ${row.label}, ${side}, ${name(side)}`}
          aria-expanded={open === side} aria-controls={`${id}-${side}`}
          onClick={() => setOpen(open === side ? null : side)}>
          <span aria-hidden="true">{open === side ? "▾" : "▸"}</span> Basis & sources
        </button>
      </td>)}
      <td role="cell" className={row.change.tone === "INCREASE" ? styles.increase : row.change.tone === "DECREASE" ? styles.decrease : ""}>
        <span className={styles.mobileLabel} aria-hidden="true">Change per month</span>
        {row.change.state === "AVAILABLE" ? row.change.text : "Not comparable"}
      </td>
    </tr>
    {sides.map((side) => <tr role="row" key={side} hidden={open !== side} className={styles.sourceDisclosureRow}>
      <td role="cell" colSpan={4}>
        <div id={`${id}-${side}`} role="region" aria-labelledby={`${id}-${side}-heading`} className={styles.sourcePanel}>
          {open === side && <>
            <h3 id={`${id}-${side}-heading`}>{row.label} — {context(side)}</h3>
            <ExplanationContent explanation={row[side].explanation} />
          </>}
        </div>
      </td>
    </tr>)}
  </>;
}

/** Disclosure state only; all amounts and provenance remain the supplied view model. */
export function CostBreakdown({ rows, currentName, destinationName }: Props) {
  return <section id="breakdown" className={styles.panel}>
    <h2>Your monthly costs compared</h2>
    <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Monthly costs table">
      <table role="table" className={styles.table}>
        <caption className={styles.srOnly}>Monthly costs in pounds, by category and location</caption>
        <thead role="rowgroup"><tr role="row">
          <th role="columnheader" scope="col">Category</th>
          <th role="columnheader" scope="col">Current<small>{currentName}</small></th>
          <th role="columnheader" scope="col">Destination<small>{destinationName}</small></th>
          <th role="columnheader" scope="col">Change</th>
        </tr></thead>
        {rows.map((row) => <tbody role="rowgroup" className={styles.costGroup} key={row.category}>
          <CostRows row={row} currentName={currentName} destinationName={destinationName} />
        </tbody>)}
      </table>
    </div>
  </section>;
}
