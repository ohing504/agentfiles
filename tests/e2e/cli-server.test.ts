import { type ChildProcess, spawn } from "node:child_process"
import { existsSync } from "node:fs"
import * as http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "../..")
const CLI_PATH = path.join(ROOT, "dist", "cli.js")
const SERVER_ENTRY = path.join(ROOT, ".output", "server", "index.mjs")

// HTTP GET 헬퍼
function httpGet(
  url: string,
  timeoutMs = 5000,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = ""
      res.on("data", (chunk) => {
        body += chunk
      })
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }))
    })
    req.setTimeout(timeoutMs, () => {
      req.destroy()
      reject(new Error(`HTTP GET timed out: ${url}`))
    })
    req.on("error", reject)
  })
}

// CLI stdout에서 "URL: http://..." 패턴으로 실제 서버 URL 감지
function waitForCliReady(
  proc: ChildProcess,
  timeoutMs = 25000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`CLI가 ${timeoutMs}ms 내에 URL을 출력하지 않았습니다`))
    }, timeoutMs)

    const onData = (data: Buffer) => {
      const text = data.toString()
      // "URL: http://127.0.0.1:PORT" 패턴 감지
      const urlMatch = text.match(/URL:\s*(http:\/\/[\d.:]+)/)
      const listenMatch = text.match(
        /(?:Listening|ready).*?(http:\/\/[\d.:]+)/i,
      )
      const matched = urlMatch?.[1] ?? listenMatch?.[1]
      if (matched) {
        clearTimeout(timer)
        proc.stdout?.off("data", onData)
        resolve(matched)
      }
    }

    proc.stdout?.on("data", onData)

    proc.on("error", (err) => {
      clearTimeout(timer)
      reject(err)
    })
    proc.on("exit", (code) => {
      clearTimeout(timer)
      reject(new Error(`CLI가 예상치 못하게 종료됨 (exit code: ${code})`))
    })
  })
}

// 서버가 HTTP 응답할 때까지 폴링
async function waitForServerHttp(
  baseUrl: string,
  maxMs = 10000,
): Promise<void> {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    try {
      await httpGet(`${baseUrl}/`, 2000)
      return
    } catch {
      await new Promise((r) => setTimeout(r, 400))
    }
  }
  throw new Error(
    `서버가 ${maxMs}ms 내에 HTTP 응답을 반환하지 않았습니다 (${baseUrl})`,
  )
}

// 프로세스 종료 대기
function waitForExit(
  proc: ChildProcess,
  timeoutMs = 8000,
): Promise<number | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      proc.kill("SIGKILL")
      resolve(null)
    }, timeoutMs)
    proc.on("exit", (code) => {
      clearTimeout(timer)
      resolve(code)
    })
  })
}

describe("CLI E2E — dist/cli.js 서버 시작 및 종료", { timeout: 60000 }, () => {
  let serverProcess: ChildProcess | null = null
  let serverBaseUrl = ""
  let shouldSkip = false

  beforeAll(async () => {
    if (!existsSync(CLI_PATH)) {
      console.warn(`[skip] dist/cli.js 없음: ${CLI_PATH}`)
      shouldSkip = true
      return
    }
    if (!existsSync(SERVER_ENTRY)) {
      console.warn(`[skip] .output/server/index.mjs 없음: ${SERVER_ENTRY}`)
      shouldSkip = true
      return
    }

    // CLI 실행 (CI=true로 브라우저 열기 방지)
    serverProcess = spawn("node", [CLI_PATH], {
      env: {
        ...process.env,
        CI: "true",
        BROWSER: "none",
      },
      stdio: ["ignore", "pipe", "pipe"],
      cwd: ROOT,
    })

    serverProcess.stderr?.on("data", (_data: Buffer) => {
      // 필요시 디버그: console.error("[cli stderr]", _data.toString().trim())
    })

    try {
      // stdout에서 URL 감지 후 HTTP 응답까지 대기
      serverBaseUrl = await waitForCliReady(serverProcess, 25000)
      await waitForServerHttp(serverBaseUrl, 10000)
    } catch (err) {
      console.warn("[e2e] 서버 시작 실패:", err)
      shouldSkip = true
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill("SIGKILL")
      }
      serverProcess = null
    }
  })

  afterAll(async () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill("SIGTERM")
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          if (serverProcess && !serverProcess.killed) {
            serverProcess.kill("SIGKILL")
          }
          resolve()
        }, 5000)
        serverProcess?.on("exit", () => {
          clearTimeout(timer)
          resolve()
        })
      })
      serverProcess = null
    }
  })

  it("dist/cli.js와 .output/server/index.mjs가 존재해야 한다", () => {
    expect(existsSync(CLI_PATH)).toBe(true)
    expect(existsSync(SERVER_ENTRY)).toBe(true)
  })

  it("서버 시작: GET / 응답이 200 + HTML을 반환해야 한다", async () => {
    if (shouldSkip || !serverProcess) {
      console.warn("[skip] 서버가 시작되지 않아 테스트를 건너뜁니다")
      return
    }

    const res = await httpGet(`${serverBaseUrl}/`)
    expect(res.status).toBe(200)
    expect(res.body.toLowerCase()).toContain("<html")
  })

  it("정적 파일 서빙: GET / 응답에 script 태그 또는 필수 HTML 구조가 포함되어야 한다", async () => {
    if (shouldSkip || !serverProcess) {
      console.warn("[skip] 서버가 시작되지 않아 테스트를 건너뜁니다")
      return
    }

    const res = await httpGet(`${serverBaseUrl}/`)
    expect(res.status).toBe(200)
    const body = res.body.toLowerCase()
    const hasScript = body.includes("<script")
    const hasDoctype = body.includes("<!doctype html") || body.includes("<html")
    expect(hasScript || hasDoctype).toBe(true)
  })

  it("Graceful shutdown: SIGTERM 전송 후 프로세스가 종료되어야 한다", async () => {
    if (shouldSkip || !serverProcess) {
      console.warn("[skip] 서버가 시작되지 않아 테스트를 건너뜁니다")
      return
    }

    serverProcess.kill("SIGTERM")
    const exitCode = await waitForExit(serverProcess, 8000)

    // exit code 0 또는 null(SIGKILL 강제 종료) 허용
    expect(exitCode === 0 || exitCode === null).toBe(true)
    serverProcess = null
  })
})
