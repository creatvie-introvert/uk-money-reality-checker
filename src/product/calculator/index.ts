export * from "./contracts";
export { buildCalculatorInputsFromForm, calculatorFormSchema } from "./adapter";
export { calculateProductResult, createProductCalculator, type ProductCalculation } from "./orchestrator";
export { composeProductResult } from "./composer";
export { buildResultsViewModel, type ResultsViewModel } from "./view-model";
export { classificationLabels } from "./copy";
