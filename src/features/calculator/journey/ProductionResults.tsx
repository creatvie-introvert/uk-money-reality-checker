"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { EmptyResults, ResultsPage } from "@/components/report/ResultsPage";
import { stepPath, type JourneyStep } from "@/product/calculator/journey";
import { useJourney } from "./JourneyProvider";
export function ProductionResults() {
  const { state, dispatch } = useJourney(), router = useRouter(), container = useRef<HTMLDivElement>(null);
  useEffect(() => { const heading = container.current?.querySelector("h1"); heading?.setAttribute("tabindex", "-1"); heading?.focus(); }, []);
  const restart = () => { dispatch({ type: "RESTART" }); router.push("/calculator"); };
  const edit = (category?: string) => {
    const routes: Record<string, JourneyStep> = { rent: "household", council_tax: "household", water: "spending", energy: "spending", groceries: "spending", essentials: "spending", transport: "transport", lifestyle: "lifestyle" };
    const step = category ? routes[category] ?? "income" : "review";
    if (step !== "review") dispatch({ type: "EDIT" });
    router.push(stepPath(step));
  };
  return <div ref={container}>{state.result ? <ResultsPage model={state.result.view} onRestart={restart} onEdit={edit} /> : <EmptyResults />}</div>;
}
