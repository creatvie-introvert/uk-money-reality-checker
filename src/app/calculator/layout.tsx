import type { ReactNode } from "react";
import { JourneyProvider } from "@/features/calculator/journey/JourneyProvider";
export default function CalculatorLayout({ children }: { children: ReactNode }) {
  return <JourneyProvider>{children}</JourneyProvider>;
}
