import { describe, expect, it } from "vitest";
import { courseFilter } from "./course-search";

const CS1 = "COP3502C Computer Science I";

describe("courseFilter", () => {
  it("matches codes typed with or without spaces, any case", () => {
    for (const q of ["COP3502C", "cop3502", "cop 3502", "COP 3502C", "3502"]) {
      expect(courseFilter(CS1, q), q).toBe(1);
    }
  });

  it("matches words from the course name in any order", () => {
    expect(courseFilter(CS1, "computer science")).toBe(1);
    expect(courseFilter(CS1, "science comp")).toBe(1);
  });

  it("needs every word", () => {
    expect(courseFilter(CS1, "cop chemistry")).toBe(0);
    expect(courseFilter(CS1, "STA2023")).toBe(0);
  });

  it("an empty search shows everything", () => {
    expect(courseFilter(CS1, "   ")).toBe(1);
  });
});
