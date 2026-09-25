import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { cityDefinitions } from "@/product/cities/registry";
import { cityPhotography } from "@/product/homepage/city-photography";

it("ships exactly the approved city assets with matching provenance hashes", () => {
  expect(Object.keys(cityPhotography)).toEqual(cityDefinitions.map((city) => city.slug));
  for (const { slug } of cityDefinitions) {
    const photo = cityPhotography[slug];
    const bytes = readFileSync(resolve("public", photo.localFilename.slice(1)));
    expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
    expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(photo.localSha256);
    expect(bytes.length).toBe(photo.localBytes);
    expect(photo.approvalStatus).toBe("owner-approved");
    expect(photo.verificationStatus).toBe("verified");
    expect(photo.sourcePageUrl).toMatch(/^https:\/\/commons.wikimedia.org\/wiki\/File:/);
    expect(photo.licenceUrl).toMatch(/^https:\/\/creativecommons.org\//);
  }
});

it("pins Edinburgh Option 1 and retains important licence and edit-history distinctions", () => {
  expect(cityPhotography.edinburgh.creator).toBe("Jim Barton");
  expect(cityPhotography.edinburgh.sourcePageUrl).toContain("7467002");
  expect(cityPhotography.edinburgh.reviewSha1).toBe("84cd7b44be9700a76cb6bd48a8e3633a448f859b");
  expect(cityPhotography.birmingham.licence).toBe("CC BY 2.0");
  expect(cityPhotography.birmingham.licenceNotes).toContain("Structured data additionally lists CC BY-SA 2.0");
  expect(cityPhotography.manchester.previousModifications.join(" ")).toContain("Chocolateediter");
  expect(cityPhotography.glasgow.licenceNotes).toContain("voluntarily");
});
