import type { Metadata } from "next";
import { PolicyPage } from "@/components/policies/PolicyPage";
import { accessibilitySections } from "@/product/policies/content";
export const metadata: Metadata = { title: "Accessibility | UK Money Reality", description: "Keyboard and responsive support, completed browser checks, known manual-testing limitations and how to report an accessibility problem." };
export default function AccessibilityPage() { return <PolicyPage title="Accessibility" introduction="The support available when using this website, the checks completed and the testing still needed." sections={accessibilitySections} />; }
