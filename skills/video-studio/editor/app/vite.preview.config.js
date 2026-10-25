// Builds the "Try it on your video" bundle for the shared effects page (one self-contained script).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // CPU-only ONNX runtime: its wasm (14 MB) fits the page's file limit; the WebGPU build's does not
  resolve: { alias: [{ find: /^onnxruntime-web\/webgpu$/, replacement: new URL("./node_modules/onnxruntime-web/dist/ort.wasm.min.mjs", import.meta.url).pathname }] },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: "dist-preview",
    emptyOutDir: true,
    lib: { entry: "src/preview/main.jsx", formats: ["es"], fileName: () => "try.js" },
    rollupOptions: { output: { chunkFileNames: "[name]-[hash].js" } },
    chunkSizeWarningLimit: 4000,
  },
});
// Note: after building, scripts/escape-fffd.py rewrites literal U+FFFD characters as �,
// because the page host rejects files containing them.
