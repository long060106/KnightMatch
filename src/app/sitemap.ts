import type { MetadataRoute } from "next";
import { meta, projects } from "@/lib/data";
import { absoluteUrl } from "@/lib/seo";

// Rebuilt with every data commit, so lastModified follows the hourly KRSP check.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/projects", "/match", "/other-places", "/about"].map((path) => ({
    url: absoluteUrl(path),
    lastModified: path === "/" || path === "/projects" ? meta.last_run_at : undefined,
  }));
  const projectPages = projects.map((p) => ({
    url: absoluteUrl(`/projects/${p.id}`),
    lastModified: p.last_changed_at,
  }));
  return [...pages, ...projectPages];
}
