import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Teaching content lives in the database and reaches the site through
    // /api/content only. The seed files that fill a fresh database are the
    // API's business — the site must never import them (or any server code).
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/server/**", "**/seed/**", "**/shared/curriculum*", "@/data/*"],
              message:
                "Teaching content comes from the database: use api.content (or fetchContent on a public page).",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code worktrees are full copies of the repo; lint the real tree only.
    ".claude/**",
  ]),
]);

export default eslintConfig;
