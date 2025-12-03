import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  ssr: {
    noExternal: ['@stackframe/react', '@stackframe/stack-ui'],
  },
  build: {
    ssr: true,
    outDir: path.resolve(import.meta.dirname, "dist/server"),
    rollupOptions: {
      input: path.resolve(import.meta.dirname, "client", "src", "entry-server.tsx"),
    },
    emptyOutDir: false,
  },
});
