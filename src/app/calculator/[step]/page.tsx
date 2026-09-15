import { notFound } from "next/navigation";
import { JourneyPage } from "@/features/calculator/journey/JourneyPage";
import { steps, type JourneyStep } from "@/product/calculator/journey";
export default async function CalculatorStepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!steps.includes(step as JourneyStep) || step === "start") notFound();
  return <JourneyPage key={step} step={step as JourneyStep} />;
}
