import { cityDefinitions } from "@/product/cities/registry";

/** Never infer a canonical host from request headers or a preview hostname. */
export function canonicalOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || url.port) throw new Error();
    return url.origin;
  } catch { throw new Error("SITE_URL must be an approved HTTPS origin without credentials, path, query or fragment"); }
}
export const publicPaths = ["/", "/calculator", "/cities", ...cityDefinitions.map((c) => `/cities/${c.slug}`), "/methodology", "/sources", "/privacy", "/accessibility"] as const;
export function sitemapXml(origin: string): string {
  const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + publicPaths.map((path) => `  <url><loc>${escape(new URL(path, origin).href)}</loc></url>`).join("\n") + "\n</urlset>\n";
}
export function robotsText(origin?: string): string {
  return "User-agent: *\nAllow: /\nDisallow: /dev/\nDisallow: /calculator/results\nDisallow: /src/\n" + (origin ? `Sitemap: ${origin}/sitemap.xml\n` : "");
}
