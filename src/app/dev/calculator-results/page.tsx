import { notFound } from "next/navigation";
import { ResultsPreview } from "@/features/calculator/development/ResultsPreview";

export default function DevelopmentResultsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ResultsPreview />;
}
