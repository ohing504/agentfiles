import { paraglideVitePlugin } from "@inlang/paraglide-js"
import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"
import viteTsConfigPaths from "vite-tsconfig-paths"
import { mergeMessages } from "./scripts/merge-messages.mjs"

function mergeMessagesPlugin() {
  return {
    name: "merge-messages",
    buildStart() {
      mergeMessages()
    },
    handleHotUpdate({
      file,
      server,
    }: {
      file: string
      server: { ws: { send: (msg: object) => void } }
    }) {
      if (/\/messages\/[^/]+\/[^/]+\.json$/.test(file)) {
        mergeMessages()
        server.ws.send({ type: "full-reload" })
        return []
      }
    },
  }
}

const config = defineConfig({
  plugins: [
    mergeMessagesPlugin(),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      strategy: ["cookie", "preferredLanguage", "baseLocale"],
    }),
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
