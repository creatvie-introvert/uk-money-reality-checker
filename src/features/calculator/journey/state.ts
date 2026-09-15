import type { ProductCalculatorResult } from "@/product/calculator/contracts";
import type { ResultsViewModel } from "@/product/calculator/view-model";
import { changeField, emptyForm, type JourneyStep } from "@/product/calculator/journey";
export interface JourneyState {
  form: ReturnType<typeof emptyForm>;
  completed: JourneyStep[];
  editing: boolean;
  result?: { product: ProductCalculatorResult; view: ResultsViewModel };
}
export type JourneyAction = { type: "CHANGE"; path: string; value: string; step: JourneyStep }
  | { type: "COMPLETE"; step: JourneyStep } | { type: "EDIT" } | { type: "END_EDIT" }
  | { type: "RESULT"; result: NonNullable<JourneyState["result"]> } | { type: "RESTART" };
export const initialJourney = (): JourneyState => ({ form: emptyForm(), completed: [], editing: false });
export function journeyReducer(state: JourneyState, action: JourneyAction): JourneyState {
  switch (action.type) {
    case "CHANGE": return { ...state, form: changeField(state.form, action.path, action.value), result: undefined, completed: state.completed.filter((s) => s !== action.step) };
    case "COMPLETE": return { ...state, completed: [...new Set([...state.completed, action.step])] };
    case "EDIT": return { ...state, editing: true };
    case "END_EDIT": return { ...state, editing: false };
    case "RESULT": return { ...state, result: action.result, editing: false };
    case "RESTART": return initialJourney();
  }
}
