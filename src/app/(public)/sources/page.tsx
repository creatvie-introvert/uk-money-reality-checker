import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/public/ComingSoonPage";

export const metadata: Metadata = {
  title: "Sources — In preparation | UK Money Reality",
  description: "The public sources register is being prepared. Source links and category-specific periods are already available within calculator results.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <ComingSoonPage title="The sources page is being prepared" description="The public sources register is being prepared. Source links and category-specific periods are already available within calculator results." />;
}
