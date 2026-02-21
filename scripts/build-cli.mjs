#!/usr/bin/env node
import { build } from "esbuild"
import { mkdirSync } from "node:fs"

mkdirSync("dist", { recursive: true })

await build({
  entryPoints: ["bin/cli.ts"],
  outfile: "dist/cli.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  // node built-ins와 npm 패키지들은 번들링하지 않음
  external: [
    "node:*",
    "open",
  ],
})

console.log("CLI built: dist/cli.js")
