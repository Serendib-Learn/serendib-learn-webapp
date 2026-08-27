import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the Docker image (see the root Dockerfile) ship only the traced
  // runtime files instead of the full node_modules tree. Vercel does its
  // own file tracing/bundling and the two collide (its builder goes
  // looking for .next/next-server.js.nft.json in a layout "standalone"
  // output changes), so this must stay off during a Vercel build — Vercel
  // sets VERCEL=1 for every build it runs.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // No Content-Security-Policy here deliberately: this app loads
          // Google Identity Services and Cloudflare Turnstile as external
          // <script> tags, and Next's own hydration scripts need either a
          // nonce or 'unsafe-inline' to run under a strict CSP — doing that
          // correctly needs per-request nonce middleware, not a static
          // header, so it's a separate piece of work rather than something
          // to bolt on here and risk silently breaking sign-in or the
          // CAPTCHA. The headers below don't have that failure mode.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
