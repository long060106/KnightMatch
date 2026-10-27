import { describe, expect, it } from "vitest";
import projectsJson from "../../data/projects.json";
import { clip, pageMetadata, projectDescription, spotsSentence, summarize } from "./seo";
import type { Project } from "./types";

const projects = projectsJson as unknown as Project[];

function project(overrides: Partial<Project>): Project {
  return { ...projects[0], ...overrides };
}

describe("clip", () => {
  it("leaves short text alone", () => {
    expect(clip("Plant micro technique", 40)).toBe("Plant micro technique");
  });

  it("cuts at a word and drops trailing punctuation", () => {
    expect(clip("Plants, microbes, cells and animals", 18)).toBe("Plants, microbes…");
    expect(clip("Plants, microbes, cells and animals", 18).length).toBeLessThanOrEqual(18);
  });
});

describe("summarize", () => {
  it("drops lead labels and line breaks", () => {
    expect(summarize("Project Overview:\n\nThis project investigates how plants regenerate.", 200)).toBe(
      "This project investigates how plants regenerate.",
    );
    expect(summarize("BACKGROUND: When landing on a lunar surface, damage occurs.", 200)).toBe(
      "When landing on a lunar surface, damage occurs.",
    );
    expect(summarize("Subject: Neon Soul is a 3D-animated short film.", 200)).toBe("Neon Soul is a 3D-animated short film.");
  });

  it("keeps a colon that belongs to the sentence", () => {
    const text = "We will complete a mixed-methods study to address 2 separate aims: 1. To explore";
    expect(summarize(text, 200)).toBe(text);
  });
});

describe("spotsSentence", () => {
  it("says how many spots are open, or that the team is full", () => {
    expect(spotsSentence({ status: "open", open_spots: 2, team_size: 4 })).toBe("2 of 4 spots open");
    expect(spotsSentence({ status: "open", open_spots: 1, team_size: 4 })).toBe("1 of 4 spots open");
    expect(spotsSentence({ status: "open", open_spots: 1, team_size: null })).toBe("1 spot open");
    expect(spotsSentence({ status: "open", open_spots: 3, team_size: null })).toBe("3 spots open");
    expect(spotsSentence({ status: "full", open_spots: 0, team_size: 4 })).toBe("Full team");
    expect(spotsSentence({ status: "open", open_spots: null, team_size: null })).toBeNull();
  });
});

describe("projectDescription", () => {
  it("leads with college, semester and spots", () => {
    const text = projectDescription(
      project({
        affiliation: "College of Sciences",
        semester: "Fall 2026",
        status: "open",
        open_spots: 2,
        team_size: 4,
        description: "Project Overview:\n\nThis project investigates the evolution of plants.",
      }),
    );
    expect(text).toBe("Sciences, Fall 2026. 2 of 4 spots open. This project investigates the evolution of plants.");
  });

  it("fits every real project in a search snippet, on one line", () => {
    for (const p of projects) {
      const text = projectDescription(p);
      expect(text.length).toBeLessThanOrEqual(160);
      expect(text).not.toMatch(/\n/);
      expect(text).not.toMatch(/Project Overview/);
    }
  });
});

describe("pageMetadata", () => {
  it("gives link previews the page's own title, not the home page's", () => {
    const meta = pageMetadata({ title: "All projects", description: "Every project.", path: "/projects" });
    expect(meta.title).toBe("All projects");
    expect(meta.alternates?.canonical).toBe("/projects");
    expect(meta.openGraph?.title).toBe("All projects | KnightMatch");
    expect(meta.twitter?.title).toBe("All projects | KnightMatch");
  });

  it("adds the site card unless the page draws its own", () => {
    const withCard = pageMetadata({ title: "About", description: "About.", path: "/about" });
    expect(withCard.openGraph?.images).toEqual([expect.objectContaining({ url: "/opengraph-image" })]);
    const own = pageMetadata({ title: "A project", description: "A.", path: "/projects/x", siteImage: false });
    expect(own.openGraph).not.toHaveProperty("images");
    expect(own.twitter).not.toHaveProperty("images");
  });

  it("leaves the title to the layout on the home page", () => {
    const meta = pageMetadata({ description: "Home.", path: "/" });
    expect(meta).not.toHaveProperty("title");
    expect(meta.openGraph?.title).toBe("KnightMatch: UCF research projects you can join");
  });
});
