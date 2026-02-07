import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "~": path.resolve(__dirname, "./src") } },
  optimizeDeps: {
    exclude: ["react-syntax-highlighter"],
  },
  build: {
    rollupOptions: {
      external: [/^refractor\/.*/, "@babel/runtime/helpers/asyncToGenerator", "@babel/runtime/regenerator"],
    },
  },
});
