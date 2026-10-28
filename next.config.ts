import type { NextConfig } from "next";

const isMobile = process.env.BUILD_TARGET === "mobile";

const nextConfig: NextConfig = {
  ...(isMobile ? { output: "export" } : {}),
  /* config options here */
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
