const INVALID_NAME_PATTERN = /[/\\]|\.{2}/

export function validateItemName(name: string): void {
  if (!name || INVALID_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid item name: ${name}`)
  }
}
