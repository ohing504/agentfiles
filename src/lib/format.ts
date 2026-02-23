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

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}
