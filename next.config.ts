import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is still prerendered at build time. The server only runs a few small routes in
  // src/app/api: the AI email coach, the team leader's email from KRSP, the last-check time, and
  // the hourly nudge that starts the KRSP check on GitHub.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
