import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JourneyProvider } from "@/features/calculator/journey/JourneyProvider";
export const metadata: Metadata = {
  title: "Move Calculator | UK Money Reality",
  description: "Compare your household costs, take-home pay and monthly buffer across supported UK cities. Unknown costs remain visible and source explanations accompany your results.",
};
export default function CalculatorLayout({ children }: { children: ReactNode }) {
  return <JourneyProvider>{children}</JourneyProvider>;
}
