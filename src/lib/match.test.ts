import { describe, expect, it } from "vitest";
import { compareMatches, expandSkills, matchProject, matchRatio, matchTier, profileSkills } from "./match";
import type { SkillMap } from "./types";

const skills: SkillMap = {
  programming_basics: { id: "programming_basics", label: "Programming", category: "p", counts: true, parent: null },
  python: { id: "python", label: "Python", category: "p", counts: true, parent: "programming_basics" },
  c_cpp: { id: "c_cpp", label: "C/C++", category: "p", counts: true, parent: "programming_basics" },
  three_d_software: { id: "three_d_software", label: "3D software", category: "c", counts: true, parent: null },
  maya: { id: "maya", label: "Maya", category: "c", counts: true, parent: "three_d_software" },
  teamwork: { id: "teamwork", label: "Teamwork", category: "soft", counts: false, parent: null },
  citi_training: { id: "citi_training", label: "CITI", category: "training", counts: false, parent: null },
};

describe("expandSkills", () => {
  it("adds the parent of each owned skill, not the other way round", () => {
    expect([...expandSkills(["python"], skills)].sort()).toEqual(["programming_basics", "python"]);
    expect([...expandSkills(["three_d_software"], skills)]).toEqual(["three_d_software"]);
  });
});

describe("profileSkills", () => {
  it("combines ticked skills with skills from completed courses", () => {
    const have = profileSkills(
      { skills: ["maya"], courses: ["COP3502C", "UNKNOWN1000"], updatedAt: "" },
      { COP3502C: ["c_cpp"] },
      skills,
    );
    expect(have.has("c_cpp")).toBe(true);
    expect(have.has("programming_basics")).toBe(true);
    expect(have.has("three_d_software")).toBe(true);
  });
});

describe("matchProject", () => {
  it("counts only scored skills and lists what is missing", () => {
    const have = expandSkills(["python"], skills);
    const result = matchProject(["c_cpp", "python", "teamwork", "citi_training"], ["maya"], have, skills);
    expect(result).toEqual({ total: 2, met: ["python"], missing: ["c_cpp"], preferredMet: [] });
    expect(matchRatio(result)).toBe(0.5);
  });

  it("a child skill satisfies a generic requirement", () => {
    const result = matchProject(["programming_basics"], [], expandSkills(["c_cpp"], skills), skills);
    expect(result.met).toEqual(["programming_basics"]);
  });

  it("a project with no scored requirements is fully open", () => {
    const result = matchProject(["teamwork"], ["python"], expandSkills(["python"], skills), skills);
    expect(result.total).toBe(0);
    expect(matchRatio(result)).toBe(1);
    expect(result.preferredMet).toEqual(["python"]);
  });
});

describe("compareMatches", () => {
  const entry = (met: number, total: number, firstSeenAt = "2026-10-01T00:00:00Z") => ({
    result: { total, met: Array(met).fill("x"), missing: Array(total - met).fill("y"), preferredMet: [] },
    firstSeenAt,
  });

  it("ranks where your skills count first, then teams that list nothing, then the rest", () => {
    const list = [entry(1, 4), entry(0, 0), entry(0, 2), entry(4, 4), entry(2, 4), entry(1, 1)];
    const ordered = [...list].sort(compareMatches);
    expect(ordered.map((e) => `${e.result.met.length}/${e.result.total}`)).toEqual([
      "4/4",
      "1/1",
      "2/4",
      "1/4",
      "0/0",
      "0/2",
    ]);
  });

  it("matchTier names the four groups", () => {
    expect([entry(2, 2), entry(1, 3), entry(0, 0), entry(0, 3)].map((e) => matchTier(e.result))).toEqual([0, 1, 2, 3]);
  });

  it("with nothing met yet, fewer missing skills ranks higher", () => {
    const ordered = [entry(0, 7), entry(0, 1), entry(0, 3)].sort(compareMatches);
    expect(ordered.map((e) => e.result.total)).toEqual([1, 3, 7]);
  });

  it("breaks ties with the newer listing", () => {
    const older = entry(1, 2, "2026-09-01T00:00:00Z");
    const newer = entry(1, 2, "2026-10-01T00:00:00Z");
    expect([older, newer].sort(compareMatches)[0]).toBe(newer);
  });
});
