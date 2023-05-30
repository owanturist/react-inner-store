import { defineConfig } from "tsup"
import replace from "esbuild-plugin-replace-regex"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  esbuildPlugins: [
    replace({
      filter: /\.ts$/,
      loader: "ts",
      patterns: [
        [
          /(?<=\b(warnwarn|stopstop)\(\s*"\w+"\s*),/gm,
          `, process.env.NODE_ENV === "production" ? "" :`,
        ],
      ],
    }),
  ],
})