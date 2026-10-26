import { describe, expect, it } from "vitest";
import { findAiTells } from "./coach/coach";
import { buildEmailDraft, draftAsText, greetingName, listToText, mailtoHref } from "./email-template";

describe("greetingName", () => {
  it("uses Dr. + surname for doctoral credentials", () => {
    expect(greetingName("Chanhee Lee, PhD")).toBe("Dr. Lee");
    expect(greetingName("Jacob Bleasdale, Ph.D.")).toBe("Dr. Bleasdale");
    expect(greetingName("Ana de la Cruz, MD")).toBe("Dr. de la Cruz");
  });

  it("uses the first name otherwise (team leaders are often grad students)", () => {
    expect(greetingName("Gino Romero")).toBe("Gino");
    expect(greetingName("JoAnne Adams, MFA")).toBe("JoAnne");
    expect(greetingName("Swarna Hansi Munasinghe")).toBe("Swarna");
  });

  it("falls back to 'there'", () => {
    expect(greetingName(null)).toBe("there");
    expect(greetingName("  ")).toBe("there");
  });
});

describe("listToText", () => {
  it("joins naturally", () => {
    expect(listToText([])).toBe("");
    expect(listToText(["Python"])).toBe("Python");
    expect(listToText(["C/C++", "Python"])).toBe("C/C++ and Python");
    expect(listToText(["A", "B", "C"])).toBe("A, B and C");
  });
});

describe("buildEmailDraft", () => {
  const base = {
    projectTitle: "Secure and Fault-Tolerant Large Language Models for Embedded Systems",
    leaderName: "Chanhee Lee, PhD",
    semester: "Fall 2026",
    matchedSkills: ["C/C++", "Python"],
    relevantCourses: ["COP3502C"],
  };

  it("fills in the project, greeting, semester, skills and courses", () => {
    const draft = buildEmailDraft(base);
    expect(draft.subject).toContain(base.projectTitle);
    expect(draft.body.startsWith("Hi Dr. Lee,")).toBe(true);
    expect(draft.body).toContain(`Embedded Systems” for Fall 2026. Do you have room for someone like me?`);
    expect(draft.body).toContain("I have experience with C/C++ and Python, and I've completed COP3502C.");
    expect(draft.body).toContain("[your name]");
  });

  it("follows what professors say works: a direct ask, a specific question, who else to contact", () => {
    const { body } = buildEmailDraft(base);
    expect(body).toContain("Do you have room for someone like me?");
    expect(body).toContain("[one specific question about a part of the project]");
    expect(body).toContain("[One sentence on how you got into this field.]");
    expect(body).toContain("is there someone else you'd suggest I reach out to?");
    expect(findAiTells(body)).toEqual([]);
  });

  it("stays encouraging with no matched skills and no semester", () => {
    const draft = buildEmailDraft({ ...base, semester: null, matchedSkills: [], relevantCourses: [] });
    expect(draft.body).toContain("ready to put in the time to learn");
    expect(draft.body).toContain(`Embedded Systems”. Do you have room`);
    expect(draft.body).not.toMatch(/not qualified|not a fit/i);
  });

  it("stays short enough to read in one screen", () => {
    const words = buildEmailDraft(base).body.split(/\s+/).length;
    expect(words).toBeLessThan(150);
  });
});

describe("sharing the draft", () => {
  const draft = { subject: "Hi & welcome", body: "Line 1\nLine 2" };

  it("mailto has no recipient and encodes everything", () => {
    expect(mailtoHref(draft)).toBe("mailto:?subject=Hi%20%26%20welcome&body=Line%201%0ALine%202");
  });

  it("mailto is addressed to the team leader when we have their email", () => {
    expect(mailtoHref(draft, "a.lee@ucf.edu")).toBe("mailto:a.lee@ucf.edu?subject=Hi%20%26%20welcome&body=Line%201%0ALine%202");
  });

  it("copy text puts the subject first, after the recipient when known", () => {
    expect(draftAsText(draft)).toBe("Subject: Hi & welcome\n\nLine 1\nLine 2");
    expect(draftAsText(draft, "a.lee@ucf.edu")).toBe("To: a.lee@ucf.edu\nSubject: Hi & welcome\n\nLine 1\nLine 2");
  });
});
