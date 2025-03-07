import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    preact(),
    {
      name: "glsl",
      transform(code, id) {
        if (
          id.endsWith(".glsl") ||
          id.endsWith(".vert") ||
          id.endsWith(".frag")
        ) {
          // Return the shader code as a JavaScript string
          return {
            code: `export default ${JSON.stringify(code)};`,
            map: null,
          };
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: "dist",
    minify: "terser",
  },
});
