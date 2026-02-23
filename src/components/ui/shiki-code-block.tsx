import type { JSX } from "react"
import { Fragment, useEffect, useState } from "react"
import { jsx, jsxs } from "react/jsx-runtime"

import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { codeToHast } from "shiki/bundle/web"

const EXT_TO_LANG: Record<string, string> = {
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  py: "python",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  mts: "typescript",
}

export function detectLangFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? ""
  return EXT_TO_LANG[ext] ?? "bash"
}

interface ShikiCodeBlockProps {
  code: string
  lang?: string
  className?: string
}

export function ShikiCodeBlock({
  code,
  lang = "bash",
  className,
}: ShikiCodeBlockProps) {
  const [rendered, setRendered] = useState<JSX.Element | null>(null)

  useEffect(() => {
    let cancelled = false

    codeToHast(code, {
      lang,
      theme: "github-dark-default",
    }).then((hast) => {
      if (cancelled) return
      const element = toJsxRuntime(hast, {
        Fragment,
        jsx: jsx as any,
        jsxs: jsxs as any,
      }) as JSX.Element
      setRendered(element)
    })

    return () => {
      cancelled = true
    }
  }, [code, lang])

  // 하이라이트 전 fallback
  if (!rendered) {
    return (
      <pre
        className={`bg-muted rounded-md px-3 py-2.5 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all ${className ?? ""}`}
      >
        {code}
      </pre>
    )
  }

  return (
    <div
      className={`[&_pre]:rounded-md [&_pre]:px-3 [&_pre]:py-2.5 [&_pre]:text-sm [&_pre]:overflow-x-auto ${className ?? ""}`}
    >
      {rendered}
    </div>
  )
}
