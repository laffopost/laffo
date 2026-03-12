import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Code splitting for smaller bundles
          react: ["react", "react-dom", "react-router-dom"],
          firebase: ["firebase"],
          ui: ["react-hot-toast"],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Minify with esbuild (default, no dependencies)
    minify: "esbuild",
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "firebase"],
  },
});
