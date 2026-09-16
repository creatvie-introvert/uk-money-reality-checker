"use client";
import { createContext, useContext, useReducer, useRef, useSyncExternalStore, type ReactNode, type Dispatch } from "react";
import { initialJourney, journeyReducer, type JourneyAction, type JourneyState } from "./state";
import type { ProductCalculation } from "@/product/calculator/orchestrator";
import type { CalculatorEvidenceDto } from "@/product/calculator/evidence/types";
const Context = createContext<{ state: JourneyState; dispatch: Dispatch<JourneyAction>; hydrated: boolean; calculate: () => Promise<ProductCalculation> } | null>(null);
const subscribe = () => () => {};
export function JourneyProvider({ children, evidence }: { children: ReactNode; evidence: CalculatorEvidenceDto }) {
  const [state, dispatch] = useReducer(journeyReducer, undefined, initialJourney);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const calculator = useRef<((form: unknown) => ProductCalculation) | null>(null);
  async function calculate() {
    if (!calculator.current) {
      const [{ calculateProductResult }, { createCalculatorEvidence }] = await Promise.all([import("@/product/calculator/runtime"), import("@/product/calculator/evidence/client")]);
      const loader = createCalculatorEvidence(evidence);
      calculator.current = (form) => calculateProductResult(form, loader);
    }
    return calculator.current(state.form);
  }
  return <Context.Provider value={{ state, dispatch, hydrated, calculate }}>{children}</Context.Provider>;
}
export function useJourney() {
  const context = useContext(Context);
  if (!context) throw new Error("Calculator journey provider is required");
  return context;
}
