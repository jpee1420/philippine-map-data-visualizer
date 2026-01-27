import { getValueFromAggregates } from '@/utils/aggregateUtils'

export function getLocationValueForMap(dataStore, locationName, options = {}) {
  const { strictLevel = null, preferCount = false, allowRegionFallback = false } = options

  let value = null

  if (dataStore.selectedMetric) {
    value = dataStore.getValueForLocation(locationName)

    if ((value === null || isNaN(value)) && allowRegionFallback && dataStore.mapLevel === 'regions' && dataStore.mapFocus) {
      value = dataStore.getValueForLocation(dataStore.mapFocus)
    }

    return value
  }

  if (Array.isArray(dataStore.valueFields) && dataStore.valueFields.length > 0) {
    const aggregates =
      typeof dataStore.getLocationAggregates === 'function'
        ? dataStore.getLocationAggregates(locationName, strictLevel)
        : null

    return getValueFromAggregates(aggregates, { preferCount })
  }

  return null
}

export function getFillColorForLocation(dataStore, locationName, options = {}) {
  const { strictLevel = null, preferCount = false, allowRegionFallback = false } = options

  const value = getLocationValueForMap(dataStore, locationName, {
    strictLevel,
    preferCount,
    allowRegionFallback
  })

  if (value === null || isNaN(value) || value === 0) return '#ffffff'
  return dataStore.getColorForValue(value)
}

export function buildMapTooltipContent(dataStore, locationName) {
  const aggregates =
    typeof dataStore.getLocationAggregates === 'function'
      ? dataStore.getLocationAggregates(locationName)
      : null

  if (aggregates && aggregates.valueSummaries && aggregates.valueSummaries.length > 0) {
    const lines = []

    aggregates.valueSummaries.forEach((summary) => {
      if (!summary || !summary.field) return

      if (summary.agg === 'count') {
        lines.push(`<strong>${summary.field} (Count)</strong>`)
        const entries = Object.entries(summary.counts || {})
        if (entries.length === 0) {
          lines.push('No values')
        } else {
          entries.forEach(([val, count]) => {
            const countText = typeof count === 'number'
              ? count.toLocaleString('en-US')
              : String(count)
            lines.push(`${val}: ${countText}`)
          })
        }
      } else {
        const count = typeof summary.count === 'number' ? summary.count : 0
        let mainValue = null
        if (summary.agg === 'avg' && summary.avg != null && !isNaN(summary.avg)) {
          mainValue = summary.avg
        } else if (summary.sum != null && !isNaN(summary.sum)) {
          mainValue = summary.sum
        }

        const mainText = mainValue != null
          ? mainValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : 'N/A'

        lines.push(`<strong>${summary.field}</strong> (n=${count})`)
        lines.push(mainText)
      }
    })

    return `<strong>${locationName}</strong><br/>${lines.join('<br/>')}`
  }

  if (dataStore.selectedMetrics && dataStore.selectedMetrics.length > 0) {
    let row = dataStore.findRowByLocation(locationName)
    if (!row && dataStore.mapLevel === 'regions' && dataStore.mapFocus) {
      row = dataStore.findRowByLocation(dataStore.mapFocus)
    }

    if (row) {
      const metricLines = dataStore.selectedMetrics.map(metric => {
        const value = parseFloat(row[metric])
        const formattedValue = value !== null && !isNaN(value)
          ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : 'N/A'
        return `${metric}: ${formattedValue}`
      }).join('<br/>')

      return `<strong>${locationName}</strong><br/>${metricLines}`
    }

    return `<strong>${locationName}</strong><br/>No data available`
  }

  if (dataStore.selectedMetric) {
    let row = dataStore.findRowByLocation(locationName)
    if (!row && dataStore.mapLevel === 'regions' && dataStore.mapFocus) {
      row = dataStore.findRowByLocation(dataStore.mapFocus)
    }
    const value = row ? parseFloat(row[dataStore.selectedMetric]) : null
    const formatted = value !== null && !isNaN(value)
      ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : 'N/A'
    return `<strong>${locationName}</strong><br/>${dataStore.selectedMetric}: ${formatted}`
  }

  return `<strong>${locationName}</strong><br/>No data available`
}
