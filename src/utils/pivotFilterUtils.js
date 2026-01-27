export function getUniqueNonEmptyValues(rows, field) {
  const key = String(field)
  const seen = new Set()
  const values = []

  for (const row of rows || []) {
    const raw = row ? row[key] : null
    if (raw === null || raw === undefined || raw === '') continue
    const str = String(raw)
    if (!seen.has(str)) {
      seen.add(str)
      values.push(raw)
    }
  }

  return values
}

export function filterValuesByQuery(values, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return values || []
  return (values || []).filter(val => String(val).toLowerCase().includes(q))
}

export function isAllSelected(allValues, rawSelections) {
  if (!Array.isArray(rawSelections)) return true

  const all = (allValues || []).map(v => String(v))
  const sel = rawSelections.map(v => String(v))

  if (sel.length === 0) return false
  if (sel.length !== all.length) return false

  const set = new Set(sel)
  return all.every(v => set.has(v))
}

export function isValueSelected(allValues, rawSelections, value) {
  if (!Array.isArray(rawSelections)) return true

  const all = (allValues || []).map(v => String(v))
  const sel = rawSelections.map(v => String(v))

  if (sel.length === 0) return false
  if (sel.length === all.length) return true

  const target = String(value)
  return sel.includes(target)
}

export function toggleSelectAllSelection(checked) {
  return checked ? null : []
}

export function toggleSingleValueSelection(allValues, rawSelections, value) {
  const all = (allValues || []).map(v => String(v))
  let current = Array.isArray(rawSelections) ? rawSelections.map(v => String(v)) : all.slice()

  const target = String(value)
  const set = new Set(current)
  if (set.has(target)) {
    set.delete(target)
  } else {
    set.add(target)
  }

  const next = Array.from(set)
  if (next.length === all.length) return null
  return next
}
