import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const messagesDir = path.resolve(__dirname, "../messages")

export function mergeMessages() {
  for (const locale of ["en", "ko"]) {
    const localeDir = path.join(messagesDir, locale)
    const files = readdirSync(localeDir)
      .filter((f) => f.endsWith(".json"))
      .sort()
    const merged = {}
    for (const file of files) {
      Object.assign(merged, JSON.parse(readFileSync(path.join(localeDir, file), "utf-8")))
    }
    writeFileSync(
      path.join(messagesDir, `${locale}.json`),
      `${JSON.stringify(merged, null, 2)}\n`,
    )
  }
}

// Run directly when called as a script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mergeMessages()
  console.log("[merge-messages] Done")
}
