"use client";
import { StatusPage } from "@/components/status/StatusPage";
// Never render or log the error object: it may contain inputs or internal evidence details.
export default function ErrorPage({ retry }: { retry: () => void }) { return <StatusPage retry={retry} />; }
