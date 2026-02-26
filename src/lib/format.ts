export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export function shortenPath(absolutePath: string, homedir: string): string {
  if (absolutePath.startsWith(homedir)) {
    return `~${absolutePath.slice(homedir.length)}`
  }
  return absolutePath
}

export function formatDate(iso: string, locale?: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function titleCase(str: string): string {
  return str.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * 마크다운 파일에서 frontmatter(--- ... ---) 블록을 제거하고 본문만 반환한다.
 */
export function extractBody(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/)
  return match ? match[1].trim() : content
}
