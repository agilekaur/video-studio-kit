import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 4000 },
  server: { port: 5190, proxy: { "/api": "http://127.0.0.1:5178", "/static": "http://127.0.0.1:5178" } },
});
