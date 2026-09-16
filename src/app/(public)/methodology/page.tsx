import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/public/ComingSoonPage";

export const metadata: Metadata = {
  title: "Methodology — In preparation | UK Money Reality",
  description: "A public explanation of the calculator’s approach, supported scope and limitations is being prepared.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <ComingSoonPage title="The methodology page is being prepared" description="A public explanation of the calculator’s approach, supported scope and limitations is being prepared." />;
}
