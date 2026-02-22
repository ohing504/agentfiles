// Parses the URL param "scope:name" pattern used by detail pages
export function parseAgentFileParam(encodedName: string) {
  const decoded = decodeURIComponent(encodedName)
  const [scope, ...nameParts] = decoded.split(":")
  const name = nameParts.join(":")
  return { decoded, scope, name }
}
