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
    aggregates.valueSummaries.forEach((summary, index) => {
      if (!summary || !summary.field) return

      const fieldName = summary.field

      if (index > 0) {
        detailLines.push('<div class="callout-field-divider"></div>')
      }

      detailLines.push(
        `<div class="callout-field-title">${fieldName}</div>`
      )

      if (summary.agg === 'count') {
        // Aggregate line for count fields
        const total = typeof summary.total === 'number' ? summary.total : 0
        const totalText = total != null
          ? total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
          : 'N/A'

        let totalPctText = ''
        if (grandTotal > 0 && total != null && !isNaN(total)) {
          const pct = (total / grandTotal) * 100
          totalPctText = ` (${pct.toFixed(0)}%)`
        }

        detailLines.push(
          `<div class="callout-metric"><span class="metric-name"></span><span class="metric-value">${totalText}${totalPctText}</span></div>`
        )

        // Per-category breakdown with local percentages
        const entries = Object.entries(summary.counts || {})
        if (entries.length === 0) {
          detailLines.push(
            '<div class="callout-metric"><span class="metric-value">No values</span></div>'
          )
        } else {
          entries.forEach(([val, count]) => {
            const countNum = typeof count === 'number' ? count : NaN
            const countText = !isNaN(countNum)
              ? countNum.toLocaleString('en-US')
              : String(count)

            let pctTextLocal = ''
            if (total > 0 && !isNaN(countNum)) {
              const pct = (countNum / total) * 100
              pctTextLocal = ` (${pct.toFixed(0)}%)`
            }

            detailLines.push(
              `<div class="callout-metric"><span class="metric-name">${val}</span><span class="metric-value">${countText}${pctTextLocal}</span></div>`
            )
          })
        }
      } else {
        // Numeric fields
        const sumVal = summary.sum != null && !isNaN(summary.sum) ? summary.sum : null
        const avgVal = summary.avg != null && !isNaN(summary.avg) ? summary.avg : null

        let mainVal = null
        let aggLabel = 'Sum'

        if (summary.agg === 'avg') {
          mainVal = avgVal
          aggLabel = 'Average'
        } else {
          mainVal = sumVal
          aggLabel = 'Sum'
        }

        const mainText = mainVal != null
          ? mainVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : 'N/A'

        let mainPctText = ''
        if (grandTotal > 0 && mainVal != null && !isNaN(mainVal)) {
          const pct = (mainVal / grandTotal) * 100
          mainPctText = ` (${pct.toFixed(0)}%)`
        }

        detailLines.push(
          `<div class="callout-metric"><span class="metric-name">${aggLabel}</span><span class="metric-value">${mainText}${mainPctText}</span></div>`
        )
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
    // `<div class="callout-value">${valueText}${pctText}</div>`,
    ...detailLines,
    '</div>',
    '</div>'
  ].join('')
}

export default {}
</script>
