import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  facetCounts,
  isNewThisWeek,
  parseFilters,
  passes,
  semesterOrder,
  serializeFilters,
  shortCollege,
  toggleCount,
} from "./filters";
import type { ListingProject } from "./types";

function project(overrides: Partial<ListingProject>): ListingProject {
  return {
    id: "krsp-1",
    title: "T",
    url: "https://knight.research.ucf.edu/krsp-project/t/",
    status: "open",
    semester: "Fall 2026",
    openSpots: 2,
    teamSize: 4,
    colleges: ["College of Sciences"],
    topics: [],
    topicLabel: null,
    requiredSkills: [],
    preferredSkills: [],
    beginnerReason: null,
    firstSeenAt: "2026-10-17T00:00:00Z",
    lastCheckedAt: "2026-10-17T00:00:00Z",
    searchText: "t",
    ...overrides,
  };
}

const list = [
  project({ id: "a", colleges: ["College of Sciences"], topics: ["biology"], semester: "Fall 2026", searchText: "plant regeneration botany" }),
  project({ id: "b", colleges: ["College of Sciences"], topics: ["society", "psychology"], semester: "Spring 2027", beginnerReason: "explicit", searchText: "security decisions" }),
  project({ id: "c", colleges: ["College of Medicine"], topics: ["biology", "health"], semester: null, status: "full", openSpots: 0, searchText: "lactobacillus" }),
  project({ id: "d", colleges: ["College of Engineering and Computer Science"], topics: ["ai_ml", "devices_robotics"], semester: "Fall 2026", searchText: "llms embedded python" }),
];

describe("URL round trip", () => {
  it("defaults serialize to an empty query", () => {
    expect(serializeFilters(DEFAULT_FILTERS)).toBe("");
    expect(parseFilters("")).toEqual(DEFAULT_FILTERS);
  });

  it("keeps every filter through serialize -> parse", () => {
    const f = { mine: true, q: "python", openOnly: false, beginner: true, topics: ["ai_ml", "health"], colleges: ["College of Sciences", "College of Medicine"], semesters: ["Fall 2026"], sort: "spots" as const };
    expect(parseFilters(serializeFilters(f))).toEqual(f);
  });

  it("writes Your list as list=mine, and does not count it as a filter", () => {
    expect(serializeFilters({ ...DEFAULT_FILTERS, mine: true })).toBe("?list=mine");
    expect(parseFilters("?list=other").mine).toBe(false);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, mine: true })).toBe(0);
  });

  it("writes topics as repeated topic= params", () => {
    expect(serializeFilters({ ...DEFAULT_FILTERS, topics: ["ai_ml", "hci"] })).toBe("?topic=ai_ml&topic=hci");
  });

  it("ignores an unknown sort value", () => {
    expect(parseFilters("?sort=random").sort).toBeNull();
  });
});

describe("passes", () => {
  it("hides full teams by default", () => {
    expect(list.filter((p) => passes(p, DEFAULT_FILTERS)).map((p) => p.id)).toEqual(["a", "b", "d"]);
  });

  it("search needs every word, in any order", () => {
    const f = { ...DEFAULT_FILTERS, q: "python LLMs" };
    expect(list.filter((p) => passes(p, f)).map((p) => p.id)).toEqual(["d"]);
  });

  it("colleges and semesters are OR within a group, AND across groups", () => {
    const f = { ...DEFAULT_FILTERS, colleges: ["College of Sciences", "College of Engineering and Computer Science"], semesters: ["Fall 2026"] };
    expect(list.filter((p) => passes(p, f)).map((p) => p.id)).toEqual(["a", "d"]);
  });
});

describe("topics", () => {
  it("a project passes when any of its topics is chosen (OR), and AND with other groups", () => {
    const f = { ...DEFAULT_FILTERS, topics: ["biology", "ai_ml"] };
    expect(list.filter((p) => passes(p, f)).map((p) => p.id)).toEqual(["a", "d"]);
    expect(list.filter((p) => passes(p, { ...f, semesters: ["Spring 2027"] })).map((p) => p.id)).toEqual([]);
  });

  it("topic counts count every topic of a project and ignore the topic filter itself", () => {
    const f = { ...DEFAULT_FILTERS, topics: ["biology"] };
    expect(Object.fromEntries(facetCounts(list, f, "topics"))).toEqual({
      biology: 1,
      society: 1,
      psychology: 1,
      ai_ml: 1,
      devices_robotics: 1,
    });
    expect(Object.fromEntries(facetCounts(list, f, "colleges"))).toEqual({ "College of Sciences": 1 });
  });

  it("chosen topics add to the active filter count", () => {
    expect(activeFilterCount({ ...DEFAULT_FILTERS, topics: ["hci", "health"] })).toBe(2);
  });
});

describe("counts", () => {
  it("facet counts ignore their own group but respect the others", () => {
    const f = { ...DEFAULT_FILTERS, colleges: ["College of Sciences"] };
    expect(Object.fromEntries(facetCounts(list, f, "colleges"))).toEqual({
      "College of Sciences": 2,
      "College of Engineering and Computer Science": 1,
    });
    expect(Object.fromEntries(facetCounts(list, f, "semesters"))).toEqual({ "Fall 2026": 1, "Spring 2027": 1 });
  });

  it("toggle count shows the result of switching it on", () => {
    expect(toggleCount(list, DEFAULT_FILTERS, "beginner")).toBe(1);
  });

  it("active filter count", () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, openOnly: false, colleges: ["x", "y"] })).toBe(3);
  });
});

describe("helpers", () => {
  it("orders semesters by calendar", () => {
    const sorted = ["Fall 2027", "Spring 2027", "Fall 2026", "Summer 2027"].sort((a, b) => semesterOrder(a) - semesterOrder(b));
    expect(sorted).toEqual(["Fall 2026", "Spring 2027", "Summer 2027", "Fall 2027"]);
  });

  it("shortens college names", () => {
    expect(shortCollege("College of Engineering and Computer Science")).toBe("Engineering and Computer Science");
    expect(shortCollege("Institute for Simulation and Training")).toBe("Institute for Simulation and Training");
  });

  it("new this week excludes the first-run baseline", () => {
    const now = Date.parse("2026-10-20T12:00:00Z");
    const baseline = "2026-10-17T22:19:03Z";
    expect(isNewThisWeek(baseline, baseline, now)).toBe(false);
    expect(isNewThisWeek("2026-10-19T11:00:00Z", baseline, now)).toBe(true);
    expect(isNewThisWeek("2026-10-19T11:00:00Z", baseline, Date.parse("2026-10-30T00:00:00Z"))).toBe(false);
  });
});
