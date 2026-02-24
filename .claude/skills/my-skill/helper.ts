// Helper utilities for my-skill
export function greet(name: string): string {
  return `Hello, ${name}!`
}

export function formatOutput(data: Record<string, unknown>): string {
  return JSON.stringify(data, null, 2)
}
