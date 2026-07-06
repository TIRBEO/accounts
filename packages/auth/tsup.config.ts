import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.tsx",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["react", "react-dom", "@supabase/supabase-js", "@tirbeo/database"],
});
