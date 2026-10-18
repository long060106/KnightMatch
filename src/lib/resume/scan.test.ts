import { describe, expect, it } from "vitest";
import skillFile from "../../../data/skills.json";
import { compileAlias, scanResume, snippetAround } from "./scan";

const EMPTY: { skills: string[]; courses: string[] } = { skills: [], courses: [] };
const skillIds = (text: string, profile = EMPTY) => scanResume(text, profile).skills.map((s) => s.id);
const courseIds = (text: string, profile = EMPTY) => scanResume(text, profile).courses.map((c) => c.id);

describe("compileAlias", () => {
  it("compiles every alias in data/skills.json as a JavaScript RegExp", () => {
    for (const skill of skillFile.skills) {
      for (const alias of skill.aliases) expect(() => compileAlias(alias)).not.toThrow();
    }
  });

  it("keeps symbols like C++ and C# while refusing partial words", () => {
    expect(compileAlias("c\\+\\+").test("C++ and Java")).toBe(true);
    expect(compileAlias("c#").test("Unity (C#)")).toBe(true);
    expect(compileAlias("git").test("digital")).toBe(false);
  });
});

describe("scanResume skills", () => {
  it('finds R in "Python, R, SQL" through its case-sensitive alias', () => {
    expect(skillIds("Python, R, SQL")).toEqual(["python", "r_lang", "sql"]);
  });

  it('does not find R in "Rust" or in a lowercase r', () => {
    expect(skillIds("Rust")).not.toContain("r_lang");
    expect(skillIds("tools: python, r, sql")).not.toContain("r_lang");
  });

  it("finds R at the end of a line, not only at the end of the file", () => {
    expect(skillIds("Languages: Python, R\nExperience: lab assistant")).toContain("r_lang");
  });

  it("drops a vaguer parent when a child is found or already in the profile", () => {
    expect(skillIds("Programming in Python")).toEqual(["python"]);
    expect(skillIds("Programming experience", { skills: ["java"], courses: [] })).toEqual([]);
  });

  it("skips skills already in the profile", () => {
    expect(skillIds("Python, SQL, Git", { skills: ["sql"], courses: [] })).toEqual(["python", "git"]);
  });

  it("lists soft skills and training as not counting toward matching", () => {
    const found = scanResume("Strong teamwork and CITI training completed. Python.", EMPTY).skills;
    expect(found.find((s) => s.id === "teamwork")?.counts).toBe(false);
    expect(found.find((s) => s.id === "citi_training")?.counts).toBe(false);
    expect(found.find((s) => s.id === "python")?.counts).toBe(true);
  });

  it("reads PDF ligatures and no-break spaces", () => {
    expect(skillIds("Scientiﬁc writing; machine learning")).toEqual(["academic_writing", "machine_learning"]);
  });

  it("orders hits by where they first appear", () => {
    expect(skillIds("MATLAB first, then Python, then MATLAB again")).toEqual(["matlab", "python"]);
  });
});

describe("scanResume courses", () => {
  it('maps "COP 3502" to COP3502C', () => {
    expect(courseIds("Coursework: COP 3502, Data Structures")).toEqual(["COP3502C"]);
  });

  it('finds a course by its exact title, "Computer Science I", but not "Computer Science II" as CS I', () => {
    expect(courseIds("Relevant coursework: Computer Science I")).toEqual(["COP3502C"]);
    expect(courseIds("Relevant coursework: Computer Science II")).toEqual(["COP3503C"]);
  });

  it("keeps a lab and its lecture apart", () => {
    expect(courseIds("CHM 2046 and CHM2046L")).toEqual(["CHM2046", "CHM2046L"]);
    expect(courseIds("PHY2048L")).toEqual([]);
  });

  it("ignores codes that are not in course_skills.json", () => {
    expect(courseIds("EEL 3004 and XYZ 1234")).toEqual([]);
  });

  it("does not list the same course twice or courses already in the profile", () => {
    expect(courseIds("COP3502C (Computer Science I), COP 3502")).toEqual(["COP3502C"]);
    expect(courseIds("COP 3502 and STA 2023", { skills: [], courses: ["COP3502C"] })).toEqual(["STA2023"]);
  });

  it("needs more than one word to match a course by title", () => {
    expect(courseIds("Research assistant, plant genetics lab")).toEqual([]);
  });
});

describe("snippetAround", () => {
  it("shows about 40 characters around the match and marks where it is", () => {
    const text = "Work history at the campus library. Skills: Python, R, SQL and more stuff after that point.";
    const start = text.indexOf("Python");
    const { snippet, hit } = snippetAround(text, start, start + "Python".length);
    expect(snippet.slice(hit[0], hit[1])).toBe("Python");
    expect(snippet.startsWith("…")).toBe(true);
    expect(snippet.endsWith("…")).toBe(true);
    expect(snippet.length).toBeLessThanOrEqual(60);
  });

  it("stays on the line of the match and collapses tabs and runs of spaces", () => {
    const text = "Education\nRelevant coursework: Database Systems,\tMAS3105\nSkills\nPython";
    const mas = text.indexOf("MAS3105");
    expect(snippetAround(text, mas, mas + 7).snippet).toBe("…Database Systems, MAS3105");
    const py = text.indexOf("Python");
    expect(snippetAround(text, py, py + 6).snippet).toBe("Python");
  });
});
