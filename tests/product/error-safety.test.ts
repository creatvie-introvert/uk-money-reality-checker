import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";
import NotFound from "@/app/not-found";
import PublicNotFound from "@/app/(public)/not-found";

describe("safe recovery pages", () => {
  it.each([ErrorPage, GlobalError])("does not render error payloads", (Component) => {
    const props = { retry: () => {}, error: new Error("salary=98765 /Users/private INTERNAL_EVIDENCE" ) };
    const html = renderToStaticMarkup(createElement(Component, props));
    expect(html).not.toMatch(/98765|\/Users\/|INTERNAL_EVIDENCE|stack/);
    expect(html).toContain("Try again");
    expect(html).toContain('href="/calculator"');
  });
  it("owns one main only outside the public shell", () => {
    expect(renderToStaticMarkup(createElement(NotFound))).toContain("<main");
    const embedded = renderToStaticMarkup(createElement(PublicNotFound));
    expect(embedded).not.toContain("<main");
    expect(embedded).toContain("<section");
  });
});
