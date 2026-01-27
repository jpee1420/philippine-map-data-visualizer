export function getValueFromAggregates(aggregates, options = {}) {
  const { preferCount = false } = options

  if (!aggregates) return null

  const summaries = Array.isArray(aggregates.valueSummaries)
    ? aggregates.valueSummaries.filter(Boolean)
    : []

  const getNumeric = () => {
    const numericSummary = summaries.find(s => s && s.agg !== 'count')
    if (!numericSummary) return null

    if (numericSummary.agg === 'avg') {
      const v = numericSummary.avg
      return v != null && !isNaN(v) ? v : null
    }

    const v = numericSummary.sum
    return v != null && !isNaN(v) ? v : null
  }

  const getCount = () => {
    const countSummary = summaries.find(s => s && s.agg === 'count')
    if (!countSummary) return null

    const v = countSummary.total
    return typeof v === 'number' && !isNaN(v) ? v : null
  }

  let value = preferCount ? getCount() : getNumeric()
  if (value === null || isNaN(value)) {
    value = preferCount ? getNumeric() : getCount()
  }

  if ((value === null || isNaN(value)) && typeof aggregates.rowCount === 'number' && !isNaN(aggregates.rowCount)) {
    if (aggregates.rowCount > 0) value = aggregates.rowCount
  }

  return value
}
