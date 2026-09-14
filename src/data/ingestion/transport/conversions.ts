import { transportFareRecordSchema, transportPeriodConversionRecordSchema } from "../../schemas/records";

/** A period equivalent, not an observed monthly ticket or predicted expenditure. */
export function transportMonthlyEquivalent(raw: unknown) {
  const p = transportFareRecordSchema.parse(raw);
  if (!["weekly", "annual"].includes(p.fareType)) throw new Error("Only purchased weekly/annual products support this conversion; caps and profiles are excluded");
  const weekly = p.fareType === "weekly";
  return transportPeriodConversionRecordSchema.parse({
    recordId: `${p.recordId}:monthly`, dataset: `${p.dataset}-monthly`, category: "transport_period_conversion",
    valueType: "CALCULATED", releaseStatus: "REFERENCE_ONLY", observedRecordId: p.recordId, observedFareGbp: p.fareGbp,
    observedValidityPeriod: weekly ? "week" : "year", monthlyGbp: weekly ? p.fareGbp * 52 / 12 : p.fareGbp / 12,
    unit: "GBP/month-equivalent", formula: weekly ? "fareGbp * 52 / 12" : "fareGbp / 12", calculationVersion: "transport-monthly-v1",
    provenance: { ...p.provenance, methodologyNotes: "Exact fixed period conversion of linked published ticket price. No intermediate rounding; IEEE-754 precision. Not an observed monthly ticket, usage forecast, cap simulation or product recommendation." },
    qa: { sourceProductName: p.productName },
  });
}
