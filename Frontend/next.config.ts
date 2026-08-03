import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle for Docker.
  // All required files are copied into .next/standalone so the container
  // only needs `node server.js` — no node_modules copy required.
  output: "standalone",
};

export default nextConfig;
