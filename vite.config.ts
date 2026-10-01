import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run build`         → PWA build in dist/ (service worker, manifest, icons)
// `npm run build:single`  → one self-contained HTML file in dist-single/ (for embedding/hosting as a single page)
export default defineConfig(({ mode }) => {
  const single = mode === "single";
  return {
    base: single ? "./" : process.env.VITE_BASE || "/",
    plugins: [
      react(),
      ...(single
        ? [
            viteSingleFile(),
            { name: "strip-pwa-links", transformIndexHtml: (html: string) => html.replace(/^.*data-pwa.*$\n?/gm, "") },
          ]
        : []),
    ],
    define: { __SINGLE__: JSON.stringify(single) },
    build: single
      ? { outDir: "dist-single", copyPublicDir: false, assetsInlineLimit: 100000000, cssCodeSplit: false }
      : { outDir: "dist", sourcemap: false },
  };
});
