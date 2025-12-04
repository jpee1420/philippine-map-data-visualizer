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

/**
 * Normalize a header/field key for consistent matching
 * Converts to lowercase and removes non-alphabetic characters
 */
export function normalizeKey(raw) {
  return String(raw || '').toLowerCase().replace(/[^a-z]/g, '')
}
