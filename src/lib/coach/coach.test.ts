import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { withinLimit } from "../server/guard";
import { draftMessages, keepHoursPlaceholder, planMessages, readDraft, readPlan, soften, toggleStepLine, type CoachProject } from "./coach";
import { leaderEmailFrom } from "./krsp-contact";
import { redactContact } from "./redact";

const fixture = (name: string) => readFileSync(new URL(`../../../scraper/tests/fixtures/${name}`, import.meta.url), "utf8");

const PROJECT: CoachProject = {
  title: "Secure and Fault-Tolerant Large Language Models for Embedded Systems",
  description: "We study how bit flips in memory change LLM output on embedded boards.",
  requiredQuals: ["C/C++ and Python programming", "basic knowledge and experience to run open source LLMs"],
  preferredQuals: ["knowledge of fault-tolerance"],
  leaderName: "Chanhee Lee, PhD",
  leaderRole: "Postdoctoral Scholar",
  facultyMentor: "Jongouk Choi, PhD",
  semester: "Fall 2026",
};
const REQUEST = { projectId: "krsp-534", resume: "Avery Quinlan. Built a C++ ray tracer.", profile: ["C/C++", "COP3502C"] };

describe("prompts", () => {
  it("plan first, with the listing and the resume, and the rules that keep it honest", () => {
    const [system, user] = planMessages(PROJECT, REQUEST);
    expect(system.content).toContain("think hard");
    expect(system.content).toContain("Never invent experience");
    expect(system.content).toContain("Never write \"not qualified\"");
    expect(user.content).toContain("C/C++ and Python programming");
    expect(user.content).toContain("Built a C++ ray tracer.");
    expect(user.content).toContain("COP3502C");
  });

  it("drafts from the plan and greets the team leader properly", () => {
    const plan = readPlan({ angle: "C++ systems work", strengths: [{ point: "C++", evidence: "ray tracer", why: "required" }], not_yet_shown: [], next_steps: [] })!;
    const [system, user] = draftMessages(PROJECT, REQUEST, plan, "Dr. Lee");
    expect(system.content).toContain('"Hi Dr. Lee,"');
    expect(user.content).toContain("C++ systems work");
  });
});

describe("reading the model's answer", () => {
  it("keeps the expected shape and drops empty items", () => {
    const plan = readPlan({
      angle: "  Systems programmer who already thinks about memory  ",
      strengths: [{ point: "C++", evidence: "ray tracer", why: "It's required" }, { point: "", why: "" }],
      not_yet_shown: ["Running an open-source LLM", 4],
      next_steps: [
        {
          title: "Flip bits in LLM weights",
          what: "Run llama.cpp and write a small C++ tool that flips single bits in the weights.",
          why: "It is the project's own question in miniature.",
          time: "A weekend",
          email_line: "I've started a small C++ tool that flips bits in llama.cpp model weights.",
        },
      ],
    });
    expect(plan?.angle).toBe("Systems programmer who already thinks about memory");
    expect(plan?.strengths).toHaveLength(1);
    expect(plan?.notYetShown).toEqual(["Running an open-source LLM"]);
    expect(plan?.nextSteps[0].emailLine).toContain("llama.cpp");
  });

  it("returns null for answers with nothing usable", () => {
    expect(readPlan(null)).toBeNull();
    expect(readPlan({ angle: "x", strengths: [], next_steps: [] })).toBeNull();
    expect(readDraft({ subject: "KRSP", body: "" })).toBeNull();
  });

  it("puts paragraphs back when the model separated them with spaces", () => {
    const body = "Hi Dr. Lee,  I am Avery.  I built a driver.  Thank you for your time,  Avery Quinlan";
    expect(readDraft({ subject: "KRSP: x", body })?.body).toBe(
      "Hi Dr. Lee,\n\nI am Avery.\n\nI built a driver.\n\nThank you for your time,\nAvery Quinlan",
    );
    expect(readDraft({ subject: "KRSP: x", body: "Hi,\n\nKeep  this." })?.body).toBe("Hi,\n\nKeep  this.");
  });

  it("keeps weekly hours a placeholder unless the resume states them", () => {
    const body = "I can commit 10 hours per week. I can also give 8-12 hours a week in summer.";
    expect(keepHoursPlaceholder(body, "Built a driver.")).toBe(
      "I can commit [number] hours per week. I can also give [number] hours a week in summer.",
    );
    expect(keepHoursPlaceholder(body, "Available 10 hours per week")).toBe(body);
    expect(keepHoursPlaceholder("Trained on 10,000 images over 3 weeks.", "x")).toBe("Trained on 10,000 images over 3 weeks.");
  });

  it("never lets gatekeeping words through", () => {
    expect(soften("You are not qualified yet")).not.toMatch(/not qualified/i);
    expect(soften("This is not a good fit")).not.toMatch(/not a (good )?fit/i);
    expect(readDraft({ subject: "KRSP: hello", body: "I may be unqualified, but" })?.body).not.toMatch(/unqualified/i);
  });
});

describe("toggleStepLine", () => {
  const body = "Hi Dr. Lee,\n\nI'm Avery.\n\nI built a C++ ray tracer.\n\nThank you,\nAvery";
  const line = "I've started a bit-flip tool for llama.cpp.";

  it("adds the line to the strengths paragraph and takes it out again", () => {
    const added = toggleStepLine(body, line, true);
    expect(added).toBe(`Hi Dr. Lee,\n\nI'm Avery.\n\nI built a C++ ray tracer. ${line}\n\nThank you,\nAvery`);
    expect(toggleStepLine(added, line, true)).toBe(added);
    expect(toggleStepLine(added, line, false)).toBe(body);
  });
});

describe("redactContact", () => {
  it("takes out email, phone and street address but keeps the rest", () => {
    const text = "Avery Quinlan\n4000 Central Florida Blvd, Orlando, FL 32816 · (407) 555-0123 · avery@knights.ucf.edu\nPython, C++ · GPA 3.8 · 2024–2026";
    const out = redactContact(text);
    expect(out).not.toMatch(/avery@|555-0123|4000 Central|32816/);
    expect(out).toContain("Avery Quinlan");
    expect(out).toContain("Python, C++ · GPA 3.8 · 2024–2026");
  });

  it("leaves course codes, years and numbers in project text alone", () => {
    const text = "COP 3502, 2025 Knight Hacks, trained on 10000 images";
    expect(redactContact(text)).toBe(text);
  });
});

describe("leaderEmailFrom", () => {
  it("reads the team leader's email from a KRSP page", () => {
    expect(leaderEmailFrom(fixture("project_534.html"))).toBe("person1@example.edu");
    expect(leaderEmailFrom(fixture("project_821.html"))).toBe("person1@example.edu");
  });

  it("returns null without a Team Leader row or a valid address", () => {
    expect(leaderEmailFrom("<main><p>Nothing here</p></main>")).toBeNull();
    const row = (email: string) =>
      `<div class="project-record-row"><dt>Team Leader</dt><dd><p class="project-person-email">${email}</p></dd></div>`;
    expect(leaderEmailFrom(row("not an email"))).toBeNull();
    expect(leaderEmailFrom(row("a.lee@ucf.edu"))).toBe("a.lee@ucf.edu");
  });
});

describe("withinLimit", () => {
  it("allows up to max calls per window, then refuses until the window passes", () => {
    const key = `test-${Math.random()}`;
    const t = 1_000_000;
    expect([1, 2, 3].map((i) => withinLimit("t", key, 3, 60_000, t + i))).toEqual([true, true, true]);
    expect(withinLimit("t", key, 3, 60_000, t + 10)).toBe(false);
    expect(withinLimit("t", key, 3, 60_000, t + 60_005)).toBe(true);
  });
});
