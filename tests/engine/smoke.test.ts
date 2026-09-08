import { describe, expect, it } from "vitest";

describe("test foundation", () => {
  it("runs a framework-independent unit test", () => {
    expect("UK Money Reality").toContain("Money");
  });
});