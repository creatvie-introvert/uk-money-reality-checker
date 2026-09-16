import type { ProductAmount, ProductCalculatorResult, ProductMetric } from "./contracts";
import { actionLabels, copy, datasetLabels } from "./copy";
import { barPercent, formatMoney } from "./formatting";
import { absoluteMoney, compareMoney, fromGbp } from "@/engine/money";

const amountView = (a: ProductAmount) => ({ state: a.state, negative: a.exact !== undefined && compareMoney(a.exact, fromGbp("0")) < 0, text: a.display, badge: a.explanation.label, detail: a.explanation.summary, explanation: a.explanation });
function metricView(m: ProductMetric) {
  return { label: m.label, state: m.state, text: m.state === "AVAILABLE" ? `${m.display}/month` : "Not available", detail: m.state === "AVAILABLE" ? m.direction === "NO_CHANGE" ? "No change" : m.direction === "INCREASE" ? "Increase" : "Decrease" : m.reason, tone: m.state === "AVAILABLE" ? m.direction : "UNAVAILABLE" };
}
export function buildResultsViewModel(p: ProductCalculatorResult) {
  const costs = p.headlines.costs;
  const hero = costs.state === "AVAILABLE"
    ? costs.direction === "NO_CHANGE" ? copy.unchangedHero
      : `Your monthly household costs could be about ${formatMoney(absoluteMoney(costs.exact))} ${costs.direction === "INCREASE" ? "higher" : "lower"}`
    : p.completeness === "LIMITED" ? copy.limitedHero : copy.partialHero;
  const top = p.drivers.ranked[0];
  const salary = p.salary;
  return {
    title: hero, status: p.completeness === "COMPLETE" ? "Complete comparison" : p.completeness === "PARTIAL" ? "Partial comparison" : "Limited comparison",
    currentName: p.current.name, destinationName: p.destination.name,
    summary: [p.headlines.takeHome, p.headlines.residual].map(metricView),
    headlines: [p.headlines.costs, p.headlines.takeHome, p.headlines.residual].map(metricView),
    cards: [
      { label: "Current take-home", ...amountView(p.current.income) }, { label: "New take-home", ...amountView(p.destination.income) },
      { label: p.destination.costs.state === "PARTIAL" ? "Known monthly costs — incomplete" : "New monthly spending", ...amountView(p.destination.costs) },
      { label: p.destination.residual.state === "PARTIAL" ? copy.partialResidual : copy.buffer, ...amountView(p.destination.residual) },
    ],
    rows: p.breakdown.map((r) => ({ category: r.category, label: r.label, current: amountView(r.current), destination: amountView(r.destination), change: metricView(r.change) })),
    drivers: { title: p.drivers.title, entries: p.drivers.ranked.filter((d) => d.direction !== "NO_CHANGE").map((d) => ({ category: d.category, label: d.label, rank: d.rank, display: d.display, direction: d.direction, width: top ? barPercent(d.magnitude, top.magnitude) : 0 })), unchanged: p.drivers.unchanged.map((d) => d.label), excluded: p.drivers.excluded },
    buffers: [{ label: p.current.name, ...amountView(p.current.residual) }, { label: p.destination.name, ...amountView(p.destination.residual) }],
    salary: salary.state === "AVAILABLE" ? {
      state: "AVAILABLE" as const, label: salary.label, text: `${salary.grossAnnual.display}/year`, detail: salary.limitation,
      facts: [{ label: "Target monthly buffer", text: salary.targetResidual.display }, { label: "Required monthly net", text: salary.requiredNetMonthly.display }, { label: "Overshoot per month", text: salary.overshoot.display }, ...(salary.proposedGross ? [{ label: "Your proposed annual salary", text: salary.proposedGross.display }] : [])],
      jurisdiction: salary.jurisdiction,
    } : { state: "UNAVAILABLE" as const, label: salary.label, text: "Salary result unavailable", detail: salary.reason, facts: salary.operationalMaximum ? [{ label: "Operational annual gross limit", text: salary.operationalMaximum.display }] : [], jurisdiction: undefined },
    coverage: [p.current, p.destination].map((s) => ({ label: s.name, text: s.coverage ? `${s.coverage.resolved} of ${s.coverage.required} cost categories resolved` : "Cost coverage unavailable", detail: s.coverage ? `${s.coverage.unresolved} need input · ${s.coverage.notApplicable} explicitly not applicable` : "Review the location inputs.", effectiveOn: s.effectiveOn })),
    unresolved: p.unresolved.map((i) => ({ ...i, actionLabel: actionLabels[i.action] })),
    notice: p.unresolved.length ? "Some inputs remain unresolved. See what’s missing below." : "Calculated for the declared scope. This is not financial advice.",
    periodDisclosure: p.periodDisclosure, periods: p.periods.map((period) => ({ ...period, label: datasetLabels[period.dataset] ?? period.dataset })),
  };
}
export type ResultsViewModel = ReturnType<typeof buildResultsViewModel>;
