import { normalizeKey } from '@/utils/nameUtils'

export function getDatasetFieldDefs(dataset, availableMetrics) {
  if (!Array.isArray(dataset) || dataset.length === 0) return []

  const sample = dataset[0]
  if (!sample || typeof sample !== 'object') return []

  const keys = Object.keys(sample)

  const regionAliasKeys = new Set(['region', 'regionname', 'reg'])
  const provinceAliasKeys = new Set(['province', 'provincename', 'prov'])
  const cityAliasKeys = new Set([
    'city',
    'cityname',
    'municipality',
    'municipal',
    'municipalname',
    'municipalitycity',
    'cities',
    'municipalities',
    'citymunicipality',
    'citiesmunicipalities',
    'citymunicipalityname',
    'citiesandmunicipalities',
    'cityandmunicipality',
    'citymunicipal',
    'mun',
    'municity'
  ])

  const hasRegionAlias = keys.some(k => k !== 'region' && regionAliasKeys.has(normalizeKey(k)))
  const hasProvinceAlias = keys.some(k => k !== 'province' && provinceAliasKeys.has(normalizeKey(k)))
  const hasCityAlias = keys.some(k => k !== 'city' && cityAliasKeys.has(normalizeKey(k)))

  const visibleKeys = keys.filter(k => {
    const nk = normalizeKey(k)
    if (k === 'region' && hasRegionAlias && regionAliasKeys.has(nk)) return false
    if (k === 'province' && hasProvinceAlias && provinceAliasKeys.has(nk)) return false
    if (k === 'city' && hasCityAlias && cityAliasKeys.has(nk)) return false
    return true
  })

  const metricSet = new Set(Array.isArray(availableMetrics) ? availableMetrics : [])
  return visibleKeys.map(name => ({
    name,
    isMetric: metricSet.has(name)
  }))
}

export function buildStatsSummaryCards(rows, valueFieldDefs) {
  const defs = Array.isArray(valueFieldDefs) ? valueFieldDefs : []
  const cards = []

  if (!Array.isArray(rows) || rows.length === 0) return cards
  if (!defs.length) return cards

  const rowCount = rows.length

  defs.forEach((def) => {
    if (!def || !def.field) return
    const field = def.field
    const agg = def.agg || 'sum'
    const keyBase = String(field)

    if (agg === 'count') {
      const counts = {}
      let total = 0
      for (const row of rows) {
        const raw = row[field]
        if (raw === null || raw === undefined || raw === '') continue
        const val = String(raw)
        counts[val] = (counts[val] || 0) + 1
        total += 1
      }

      if (total === 0) {
        cards.push({
          key: `${keyBase}|count`,
          title: field,
          main: 'No values',
          lines: []
        })
        return
      }

      const totalText = total.toLocaleString('en-US')
      let totalPctText = ''
      if (rowCount > 0) {
        const pct = (total / rowCount) * 100
        totalPctText = ` (${pct.toFixed(0)}%)`
      }

      const lines = []
      const entries = Object.entries(counts)
      entries.sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      entries.forEach(([val, count]) => {
        const countNum = typeof count === 'number' ? count : Number(count)
        const countText = !isNaN(countNum)
          ? countNum.toLocaleString('en-US')
          : String(count)

        let pctTextLocal = ''
        if (total > 0 && !isNaN(countNum)) {
          const pct = (countNum / total) * 100
          pctTextLocal = ` (${pct.toFixed(0)}%)`
        }

        lines.push({
          key: `${keyBase}|${val}`,
          label: val,
          value: `${countText}${pctTextLocal}`
        })
      })

      cards.push({
        key: `${keyBase}|count`,
        title: field,
        main: `${totalText}${totalPctText}`,
        lines
      })
    } else {
      let sum = 0
      let n = 0
      for (const row of rows) {
        const v = parseFloat(row[field])
        if (!isNaN(v)) {
          sum += v
          n += 1
        }
      }

      if (n === 0) {
        cards.push({
          key: `${keyBase}|${agg}`,
          title: field,
          main: 'N/A',
          lines: []
        })
        return
      }

      const primary = agg === 'avg' ? (sum / n) : sum
      const primaryText = primary.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
      const aggLabel = agg === 'avg' ? 'Average' : 'Sum'
      const main = `${aggLabel} ${primaryText}`

      const lines = [
        {
          key: `${keyBase}|n`,
          label: 'n',
          value: n.toLocaleString('en-US')
        }
      ]

      cards.push({
        key: `${keyBase}|${agg}`,
        title: field,
        main,
        lines
      })
    }
  })

  return cards
}
