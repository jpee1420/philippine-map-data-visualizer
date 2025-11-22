<script>
export function buildCalloutHtml({
  calloutId,
  name,
  aggregates,
  value,
  grandTotal,
  fontSize,
  labelWidth,
  backgroundEnabled
}) {
  const numericValue = typeof value === 'number' && !isNaN(value) ? value : null
  const valueText = numericValue !== null
    ? numericValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : 'N/A'

  let pctText = ''
  if (grandTotal > 0 && numericValue !== null) {
    const pct = (numericValue / grandTotal) * 100
    pctText = ` (${pct.toFixed(0)}%)`
  }

  const detailLines = []

  if (aggregates && Array.isArray(aggregates.valueSummaries) && aggregates.valueSummaries.length > 0) {
    aggregates.valueSummaries.forEach((summary) => {
      if (!summary || !summary.field) return

      if (summary.agg === 'count') {
        const entries = Object.entries(summary.counts || {})
        if (entries.length === 0) {
          detailLines.push(
            '<div class="callout-metric"><span class="metric-value">No values</span></div>'
          )
        } else {
          entries.forEach(([val, count]) => {
            const countText = typeof count === 'number'
              ? count.toLocaleString('en-US')
              : String(count)
            detailLines.push(
              `<div class="callout-metric"><span class="metric-name">${val}</span><span class="metric-value">${countText}</span></div>`
            )
          })
        }
      } else {
        // For numeric fields, we no longer render a separate metric line inside
        // the callout body. The primary value is already shown in the header
        // (value + percentage), so skip adding detail lines here.
        return
      }
    })
  }

  const backgroundStyle = backgroundEnabled
    ? 'background: rgba(255, 255, 255, 0.96); border: 1px solid rgba(148, 163, 184, 0.8); box-shadow: 0 6px 18px rgba(15, 23, 42, 0.24);'
    : 'background: transparent; border: none; box-shadow: none;'

  return [
    `<div class="callout-content" data-callout-id="${calloutId}" style="font-size: ${fontSize}px; min-width: ${labelWidth}px; ${backgroundStyle}">`,
    '<div class="callout-header">',
    `<div class="callout-name">${name}</div>`,
    '</div>',
    '<div class="callout-metrics">',
    `<div class="callout-value">${valueText}${pctText}</div>`,
    ...detailLines,
    '</div>',
    '</div>'
  ].join('')
}

export default {}
</script>
