import type { Metadata } from "next";
import { PolicyPage } from "@/components/policies/PolicyPage";
import { privacySections } from "@/product/policies/content";
export const metadata: Metadata = { title: "Privacy | UK Money Reality", description: "How calculator values are processed in your browser, what the application does not store, and how website requests, hosting and external links differ." };
export default function PrivacyPage() { return <PolicyPage title="Privacy" introduction="How the current application handles your calculator values and what happens when you visit the website." sections={privacySections} />; }
