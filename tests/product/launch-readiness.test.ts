import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, afterEach } from "vitest";
import PrivacyPage, { metadata as privacyMetadata } from "@/app/(public)/privacy/page";
import AccessibilityPage, { metadata as accessibilityMetadata } from "@/app/(public)/accessibility/page";
import { privacySections, accessibilitySections } from "@/product/policies/content";
import { canonicalOrigin, publicPaths, robotsText, sitemapXml } from "@/product/launch/indexing";
import { GET as sitemap } from "@/app/sitemap.xml/route";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

afterEach(() => vi.unstubAllEnvs());
describe("launch readiness boundaries", () => {
  it.each([[PrivacyPage, privacyMetadata, "Privacy"], [AccessibilityPage, accessibilityMetadata, "Accessibility"]] as const)("renders a complete policy page", (Page, metadata, title) => {
    const html = renderToStaticMarkup(createElement(Page));
    expect(html).toContain(`<h1>${title}</h1>`);
    expect(metadata.title).toBe(`${title} | UK Money Reality`);
    expect(metadata.robots).toBeUndefined();
    expect(html).not.toMatch(/coming soon|being prepared|lorem ipsum|placeholder|TODO|<script/i);
  });
  it("qualifies privacy and accessibility claims", () => {
    const privacy = JSON.stringify(privacySections);
    expect(privacy).toMatch(/hosting/i); expect(privacy).toContain("earlier version");
    expect(privacy).not.toMatch(/we collect no data|we never use cookies|WCAG.*compliant/i);
    expect(privacy).toContain("Analytics are not currently enabled");
    expect(JSON.stringify(accessibilitySections)).toContain("VoiceOver manual QA requires owner testing");
  });
  it("requires an explicit HTTPS origin", () => {
    expect(canonicalOrigin(undefined)).toBeUndefined();
    expect(canonicalOrigin("https://example.test/")).toBe("https://example.test");
    for (const bad of ["http://example.test", "https://user:pass@example.test", "https://example.test/path", "https://example.test?salary=1", "https://example.test/#fragment", "https://example.test:8443"]) expect(() => canonicalOrigin(bad)).toThrow();
  });
  it("indexes exactly the 15 public entry routes without personal result state", () => {
    expect(publicPaths).toHaveLength(15);
    expect(new Set(publicPaths).size).toBe(15);
    expect(publicPaths.filter((p) => p.startsWith("/cities/"))).toHaveLength(8);
    const xml = sitemapXml("https://example.test");
    expect(xml.match(/<loc>/g)).toHaveLength(15);
    expect([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]).join(" ")).not.toMatch(/\/dev\/|\/calculator\/results|\/income|404|\?/);
    expect(xml).toContain("https://example.test/privacy");
  });
  it("does not invent a sitemap host; missing sign-off is explicit", async () => {
    vi.stubEnv("SITE_URL", ""); const response = sitemap();
    expect(response.status).toBe(503); expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(robotsText()).not.toContain("Sitemap:");
  });
  it("serves configured XML and robots discovery", async () => {
    vi.stubEnv("SITE_URL", "https://example.test"); const response = sitemap();
    expect(response.status).toBe(200); expect(response.headers.get("Content-Type")).toContain("application/xml");
    expect(await response.text()).toContain("https://example.test/accessibility");
    expect(robotsText("https://example.test")).toContain("Sitemap: https://example.test/sitemap.xml");
    expect(robotsText()).toContain("Disallow: /dev/");
  });
  it.each([["/index.html", "/"], ["/privacy.html", "/privacy"], ["/cookies.html", "/privacy#cookies"]] as const)("redirects only to a fixed target", (path, target) => {
    const response = proxy(new NextRequest(`https://example.test${path}?legacyValue=discard-me`));
    expect(response.status).toBe(308); expect(response.headers.get("Location")).toBe(`https://example.test${target}`);
  });
});
