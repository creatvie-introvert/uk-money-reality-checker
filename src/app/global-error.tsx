"use client";
import { StatusPage } from "@/components/status/StatusPage";
export default function GlobalError({ retry }: { retry: () => void }) {
  return <html lang="en-GB"><body><StatusPage retry={retry} /></body></html>;
}
