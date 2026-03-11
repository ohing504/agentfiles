#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process"
import { existsSync } from "node:fs"
import * as net from "node:net"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULT_PORT = 4747
const MAX_PORT_ATTEMPTS = 20
const HOST = "127.0.0.1"

// ── Helpers ──────────────────────────────────────────────

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once("error", () => resolve(false))
    server.once("listening", () => {
      server.close(() => resolve(true))
    })
    server.listen(port, HOST)
  })
}

async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + MAX_PORT_ATTEMPTS; port++) {
    if (await isPortAvailable(port)) return port
  }
  console.error(
    `Error: No available port found (tried ${startPort}-${startPort + MAX_PORT_ATTEMPTS - 1})`,
  )
  process.exit(1)
}

function detectProjectConfig(): boolean {
  const claudeDir = path.join(process.cwd(), ".claude")
  return existsSync(claudeDir)
}

function checkClaudeCli(): { available: boolean; message: string } {
  try {
    const result = execFileSync("which", ["claude"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    })
    if (result.trim()) {
      return { available: true, message: "Claude CLI detected" }
    }
    return { available: false, message: "Claude CLI not found" }
  } catch {
    return { available: false, message: "Claude CLI not found" }
  }
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  console.log("\n  agentfiles - Claude Code Agent Configuration Manager\n")

  // 1. Detect project config
  const hasProject = detectProjectConfig()
  if (hasProject) {
    console.log(`  Project: ${process.cwd()}`)
  } else {
    console.log("  Project: (none - global only mode)")
  }

  // 2. Check Claude CLI
  const cliStatus = checkClaudeCli()
  if (cliStatus.available) {
    console.log(`  CLI: ${cliStatus.message}`)
  } else {
    console.log(`  CLI: ${cliStatus.message} (read-only mode for MCP/Plugins)`)
  }

  // 3. Generate auth token
  const token = crypto.randomUUID()

  // 4. Find available port
  const port = await findAvailablePort(DEFAULT_PORT)

  // 5. Resolve server entry
  const serverEntry = path.resolve(
    __dirname,
    "..",
    ".output",
    "server",
    "index.mjs",
  )
  if (!existsSync(serverEntry)) {
    console.error(`\n  Error: Production build not found at ${serverEntry}`)
    console.error("  Run 'pnpm build' first.\n")
    process.exit(1)
  }

  // 6. Start Nitro server
  const url = `http://${HOST}:${port}`
  const urlWithToken = `${url}?token=${token}`

  console.log(`  Port: ${port}`)
  console.log(`\n  Starting server...`)

  const serverProcess = spawn("node", [serverEntry], {
    env: {
      ...process.env,
      PORT: port.toString(),
      HOST,
      NITRO_HOST: HOST,
      AGENTFILES_TOKEN: token,
    },
    stdio: ["ignore", "pipe", "pipe"],
    cwd: process.cwd(),
  })

  let started = false

  serverProcess.stdout?.on("data", async (data: Buffer) => {
    const output = data.toString()
    if (
      !started &&
      (output.includes("Listening") || output.includes("ready"))
    ) {
      started = true
      await openBrowser(urlWithToken)
    }
  })

  serverProcess.stderr?.on("data", (data: Buffer) => {
    const msg = data.toString().trim()
    if (msg) {
      console.error(`  [server] ${msg}`)
    }
  })

  serverProcess.on("error", (err) => {
    console.error(`\n  Failed to start server: ${err.message}\n`)
    process.exit(1)
  })

  serverProcess.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`\n  Server exited with code ${code}\n`)
    }
    process.exit(code ?? 0)
  })

  // 7. Fallback: open browser after a short delay even if no "Listening" message detected
  setTimeout(async () => {
    if (!started) {
      started = true
      await openBrowser(urlWithToken)
    }
  }, 3000)

  // 8. Graceful shutdown
  const shutdown = () => {
    console.log("\n  Shutting down...\n")
    serverProcess.kill("SIGTERM")
    setTimeout(() => {
      serverProcess.kill("SIGKILL")
      process.exit(0)
    }, 5000)
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)

  console.log(`\n  URL: ${url}`)
  console.log("  Press Ctrl+C to stop\n")
}

async function openBrowser(url: string) {
  try {
    const open = await import("open")
    await open.default(url, {
      app: { name: "google chrome", arguments: [`--app=${url}`] },
    })
  } catch {
    console.log(`  Open this URL in your browser: ${url}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
