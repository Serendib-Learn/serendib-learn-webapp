import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the Docker image (see the root Dockerfile) ship only the traced
  // runtime files instead of the full node_modules tree. Vercel ignores
  // this and uses its own build output either way, so it is safe alongside
  // that deployment too.
  output: "standalone",
};

export default nextConfig;
