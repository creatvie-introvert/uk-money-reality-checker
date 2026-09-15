import type { CalculationResult } from "../contracts/output";
import type { Diagnostic } from "../diagnostics";
import type { Money } from "../money";

/** M3 extension point only. No salary solver, ranking or comparison implementation. */
export type ComparisonResult =
  | { status: "RESOLVED"; destinationMinusCurrentMonthlyExpenditure: Money; diagnostics: readonly Diagnostic[] }
  | { status: "UNRESOLVED"; diagnostics: readonly Diagnostic[] };
export type ComparisonEngine = (calculation: CalculationResult) => ComparisonResult;
