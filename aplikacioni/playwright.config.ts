import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  use: {
    channel: "msedge",
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    screenshot: "only-on-failure",
  },
  projects: [375, 390].map(width => ({
    name: `mobile-${width}`,
    use: { viewport: { width, height: 844 } },
  })),
});
