export function normalizeLocationName(name) {
  const s = String(name || '')
  return s
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim()
}

// Backwards-compatible alias for older code paths
export function normalizeGADMName(name) {
  return normalizeLocationName(name)
}
