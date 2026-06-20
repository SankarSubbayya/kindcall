/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// VoiceForge dev server + Vitest config.
// Unit tests live in tests/ and only import the pure logic in convex/lib,
// so they run green without a Convex deployment or any API keys.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
