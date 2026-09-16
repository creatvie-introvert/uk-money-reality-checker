import { notFound } from "next/navigation";
export default async function DevelopmentResultsPage() {
  if (process.env.NODE_ENV === "development") {
    const { ResultsPreview } = await import("@/features/calculator/development/ResultsPreview");
    return <ResultsPreview />;
  }
  notFound();
}
