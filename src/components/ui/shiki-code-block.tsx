import type { JSX } from "react"
import { Fragment, useEffect, useState } from "react"
import { jsx, jsxs } from "react/jsx-runtime"

import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import type { ShikiTransformer } from "shiki"
import { codeToHast } from "shiki/bundle/web"

import { SHIKI_DEFAULT_COLOR, SHIKI_THEMES } from "@/lib/shiki-config"

/** Remove inline background-color from <pre> so Tailwind bg-muted applies */
const removePreBackground: ShikiTransformer = {
  pre(node) {
    if (node.properties?.style) {
      node.properties.style = (node.properties.style as string).replace(
        /background-color:[^;]+;?/,
        "",
      )
    }
  },
}

/** Add .shiki-line-numbers class to <code> for CSS counter-based line numbers */
const addLineNumbers: ShikiTransformer = {
  code(node) {
    const cls = (node.properties.class as string) || ""
    node.properties.class = `${cls} shiki-line-numbers`.trim()
  },
}

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
  /** When true, pre has no bg/rounded/padding — for use inside card containers */
  embedded?: boolean
  /** Show line numbers (default: true) */
  lineNumbers?: boolean
}

export function ShikiCodeBlock({
  code,
  lang = "bash",
  className,
  embedded = false,
  lineNumbers = true,
}: ShikiCodeBlockProps) {
  const [rendered, setRendered] = useState<JSX.Element | null>(null)

  useEffect(() => {
    let cancelled = false

    const transformers = [removePreBackground]
    if (lineNumbers) transformers.push(addLineNumbers)

    codeToHast(code, {
      lang,
      themes: SHIKI_THEMES,
      defaultColor: SHIKI_DEFAULT_COLOR,
      transformers,
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

  if (!rendered) return null

  const baseClasses = embedded
    ? "[&_pre]:text-sm [&_pre]:overflow-x-auto"
    : "[&_pre]:rounded-md [&_pre]:px-3 [&_pre]:py-2.5 [&_pre]:text-sm [&_pre]:overflow-x-auto [&_pre]:bg-muted"

  return (
    <div className={`${baseClasses} ${className ?? ""}`}>{rendered}</div>
  )
}
