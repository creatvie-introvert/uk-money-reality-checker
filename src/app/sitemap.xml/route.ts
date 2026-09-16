import { canonicalOrigin, sitemapXml } from "@/product/launch/indexing";
export const dynamic = "force-dynamic";
export function GET() {
  const origin = canonicalOrigin(process.env.SITE_URL);
  if (!origin) return new Response("Sitemap is unavailable.", { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(sitemapXml(origin), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
