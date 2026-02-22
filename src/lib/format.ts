export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}
