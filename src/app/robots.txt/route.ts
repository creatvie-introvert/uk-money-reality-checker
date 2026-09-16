import { canonicalOrigin, robotsText } from "@/product/launch/indexing";
export const dynamic = "force-dynamic";
export function GET() {
  return new Response(robotsText(canonicalOrigin(process.env.SITE_URL)), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
