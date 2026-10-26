import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is still prerendered at build time. The server only runs three small routes in
  // src/app/api: the AI email coach, the team leader's email from KRSP, and the last-check time.
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
