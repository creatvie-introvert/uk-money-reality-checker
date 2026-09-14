import { z } from "zod";
import { groceryExpenditureRecordSchema, coicopExpenditureRecordSchema, expenditurePeriodConversionRecordSchema } from "../../schemas/records";

const observedSchema = z.discriminatedUnion("category", [groceryExpenditureRecordSchema, coicopExpenditureRecordSchema]);
/** Offline evidence derivative only. It preserves the person/household denominator. */
export function monthlyEquivalent(raw: unknown) {
  const parent = observedSchema.parse(raw);
  return expenditurePeriodConversionRecordSchema.parse({
    recordId: `${parent.recordId}:monthly`, dataset: `${parent.dataset}-monthly`, category: "expenditure_period_conversion",
    valueType: "CALCULATED", releaseStatus: "REFERENCE_ONLY", geography: parent.geography, sourcePeriod: parent.sourcePeriod,
    observedRecordId: parent.recordId, observedCategory: parent.category, observedWeeklyGbp: parent.weeklyGbp,
    monthlyGbp: parent.weeklyGbp * 52 / 12, unit: parent.category === "grocery_expenditure" ? "GBP/person/month" : "GBP/household/month",
    formula: "weeklyGbp * 52 / 12", calculationVersion: "weekly-to-monthly-v1",
    provenance: { ...parent.provenance, methodologyNotes: "UKMR deterministic average monthly equivalent: observed weekly GBP * 52 / 12. No rounding before storage; IEEE-754 precision. Display rounding is separate. Denominator and source period unchanged; not an observed calendar-month amount." },
    qa: { observedSourceCell: parent.qa.sourceCell, observedSourceCode: parent.qa.sourceCategoryCode },
  });
}
