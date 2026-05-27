import { defineConfig } from "@upstart.gg/lucerna";

export default defineConfig({
  // Add extra exclusion patterns (node_modules, .git etc. are always excluded):
  exclude: ["**/docs/**", "**/bin/**", "**/examples/**", "**/public/**/*.md",  "**/docs/**/*.md", "**/memory/**/*.md", "**/README.md", "**/worker-configuration.d.ts", "**/env.d.ts"],
  embedding: {
    provider: "gemini",
    model: "gemini-embedding-001",
    apiKey: process.env.LUCERNA_GEMINI_API_KEY as string,
  }
});
