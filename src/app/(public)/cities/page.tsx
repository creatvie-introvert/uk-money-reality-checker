import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/public/ComingSoonPage";

export const metadata: Metadata = {
  title: "Cities — In preparation | UK Money Reality",
  description: "Individual pages for the supported cities are being added. For now, choose your current and destination cities in the calculator.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <ComingSoonPage title="City pages are being prepared" description="Individual pages for the supported cities are being added. For now, choose your current and destination cities in the calculator." />;
}
