import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri expects a fixed port and relative asset paths in production builds.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
  port: 1420,
  strictPort: true,
  watch: {
    // Rust build output — never let Vite's watcher near it, or it'll
    // trip over binaries being written mid-compile by cargo.
    ignored: ["**/src-tauri/**"],
  },
},
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
