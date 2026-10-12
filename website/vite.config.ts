import { defineConfig } from "vite";
export default defineConfig({ base: "./", build: { sourcemap: false, outDir: process.env.MATERIAL_COMPANION_WEB_OUTDIR || 'dist' } });
