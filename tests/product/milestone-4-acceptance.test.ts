import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { buildCityPages } from "@/product/cities/registry";
import { buildSourceRegister } from "@/product/transparency/sources";
import { activeDatasets } from "@/engine/loaders/datasets";
import { publicPaths, sitemapXml } from "@/product/launch/indexing";
import { proxy } from "@/proxy";
import MethodologyPage from "@/app/(public)/methodology/page";
import PrivacyPage from "@/app/(public)/privacy/page";
import AccessibilityPage from "@/app/(public)/accessibility/page";

const slugs = ["london", "birmingham", "manchester", "leeds", "liverpool", "bristol", "edinburgh", "glasgow"];
describe("Milestone 4 integrated public acceptance", () => {
  it("keeps city evidence and the exact sitemap inventory aligned", () => {
    const pages = buildCityPages();
    expect(pages.map((p) => p.city.slug)).toEqual(slugs);
    const paths = ["/", "/calculator", "/cities", ...slugs.map((s) => `/cities/${s}`), "/methodology", "/sources", "/privacy", "/accessibility"];
    expect(publicPaths).toEqual(paths);
    expect([...sitemapXml("https://example.test").matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => new URL(m[1]).pathname)).toEqual(paths);
    const city = (slug: string) => pages.find((p) => p.city.slug === slug)!;
    expect(city("edinburgh").coverage[0]).toMatchObject({ state: "Evidence gap", sources: [] });
    expect(JSON.stringify(city("glasgow").coverage[0])).toContain("Greater Glasgow is a broad rental market area, not Glasgow City");
    expect(JSON.stringify(city("bristol").coverage[3])).toContain("clean water = Bristol Water; wastewater = Wessex Water");
  });
  it("retains the complete recorded URL set in safe public projections", () => {
    const groups = buildSourceRegister();
    const entries = groups.flatMap((g) => g.entries);
    expect(groups).toHaveLength(8); expect(entries).toHaveLength(32);
    const urls = new Set(entries.flatMap((e) => e.citations.map((c) => c.url)));
    expect(urls.size).toBe(42);
    expect(urls).toEqual(new Set(Object.values(activeDatasets).flatMap((d) => d.artifact.records.map((r) => r.provenance.sourceUrl))));
    expect(JSON.stringify([groups, buildCityPages()])).not.toMatch(/BLOCKED_FROM_RELEASE|DEV_ONLY|ukmr_data_pack|\/Users\/|sourceCell|parserVersion|qaNotes/);
  });
  it("renders methodology limits alongside the equation and all eight costs", () => {
    const html = renderToStaticMarkup(createElement(MethodologyPage));
    for (const text of ["Monthly take-home income", "− included monthly household costs", "= monthly buffer", "Missing values do not become £0", "An override does not erase the source baseline", "City never determines your tax jurisdiction", "penny-level gross salary", "not confidence"] ) expect(html).toContain(text);
    for (const category of ["Rent", "Council tax", "Energy", "Water", "Groceries", "Essentials", "Lifestyle", "Transport"]) expect(html).toMatch(new RegExp(`<h3[^>]*>${category}</h3>`));
  });
  it("publishes qualified privacy and accessibility notices without scripts", () => {
    const privacy = renderToStaticMarkup(createElement(PrivacyPage));
    const accessibility = renderToStaticMarkup(createElement(AccessibilityPage));
    for (const text of ["does not save calculator inputs or results", "Analytics are not currently enabled", "does not read, import or update", "hosting", "application API or put them in page URLs"]) expect(privacy).toContain(text);
    expect(accessibility).toContain("VoiceOver manual QA requires owner testing");
    expect(accessibility).toContain("No WCAG conformance level");
    expect(privacy + accessibility).not.toMatch(/<script|coming soon|lorem ipsum|being prepared/);
  });
  it("drops adversarial queries for GET and HEAD while leaving valid routes and other methods alone", () => {
    for (const method of ["GET", "HEAD"]) for (const [from, to] of [["/index.html", "/"], ["/privacy.html", "/privacy"], ["/cookies.html", "/privacy#cookies"]]) {
      const response = proxy(new NextRequest(`https://example.test${from}?salary=50000&next=https://other.test`, { method }));
      expect(response.status).toBe(308);
      const target = new URL(response.headers.get("location")!);
      expect(target.href).toBe(`https://example.test${to}`);
      expect(publicPaths).toContain(target.pathname);
      expect(proxy(new NextRequest(target)).headers.get("location")).toBeNull();
    }
    for (const path of [...publicPaths, "/about.html", "/unknown"]) expect(proxy(new NextRequest(`https://example.test${path}`)).headers.get("location")).toBeNull();
    expect(proxy(new NextRequest("https://example.test/privacy.html", { method: "POST" })).headers.get("location")).toBeNull();
  });
});
