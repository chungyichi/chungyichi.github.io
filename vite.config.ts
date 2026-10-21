import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The site is rendered to static HTML by scripts/build.mjs. Vite only bundles the one island
// (the theme button) and the CSS, and writes a manifest so the HTML can reference hashed files.
export default defineConfig({
  plugins: [react()],
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    manifest: true,
    rollupOptions: { input: "src/entry-client.tsx" },
  },
});
