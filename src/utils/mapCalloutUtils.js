export function collectCalloutLocations(options) {
  const {
    geoFeatures,
    getLocationName,
    getFeatureCenter,
    getAggregatesAndValueForLocation,
    shouldIncludeFeatureForCallouts,
    hasRegionSubdivisions,
    selectedSubdivisionSet,
    isProvinceFocusView
  } = options

  const locationData = []

  ;(geoFeatures || []).forEach(feature => {
    const props = (feature && feature.properties) || {}

    const shouldInclude = shouldIncludeFeatureForCallouts(props, {
      hasRegionSubdivisions,
      selectedSubdivisionSet,
      isProvinceFocusView
    })
    if (!shouldInclude) return

    const locationName = getLocationName(feature)
    const { aggregates, value } = getAggregatesAndValueForLocation(locationName)

    if (value !== null && !isNaN(value) && value > 0) {
      const center = getFeatureCenter(feature)
      locationData.push({ name: locationName, value, center, feature, aggregates })
    }
  })

  if (!locationData.length) {
    return {
      locationData: [],
      topLocations: [],
      grandTotal: 0,
      hasTotal: false
    }
  }

  locationData.sort((a, b) => b.value - a.value)

  const grandTotal = locationData.reduce((sum, loc) => {
    const v = typeof loc.value === 'number' && !isNaN(loc.value) ? loc.value : 0
    return sum + v
  }, 0)

  const shouldShowAllCallouts =
    isProvinceFocusView || hasRegionSubdivisions || locationData.length <= 20

  const topLocations = shouldShowAllCallouts
    ? locationData
    : locationData.slice(0, 10)

  return {
    locationData,
    topLocations,
    grandTotal,
    hasTotal: grandTotal > 0
  }
}

export function createCalloutElements(options) {
  const {
    L,
    mapInstance,
    mapElement,
    layerGroup,
    location,
    index,
    zoom,
    labelPos,
    getCalloutKey,
    getZoomResponsiveSize,
    buildCalloutHtml,
    calloutBackgroundEnabled,
    calloutPositions,
    constrainLatLngToMap,
    updateConnectorLine
  } = options

  const { name, value, center, aggregates, grandTotal } = location

  const key = getCalloutKey(name)

  const responsiveSize = getZoomResponsiveSize(zoom)
  const labelWidth = responsiveSize.width
  const labelHeight = responsiveSize.height
  const fontSize = responsiveSize.fontSize
  const markerRadius = responsiveSize.markerRadius
  const lineWeight = Math.max(1, Math.round(responsiveSize.fontSize))

  const marker = L.circleMarker(center, {
    radius: markerRadius,
    fillColor: '#ff6b35',
    color: '#fff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.9
  })

  const line = L.polyline([center, labelPos], {
    color: '#666',
    weight: lineWeight,
    opacity: 0.6,
    dashArray: '5, 5'
  })

  const calloutId = `callout-${index}-${name.replace(/\s+/g, '-')}`

  const labelIcon = L.divIcon({
    className: 'callout-label',
    html: buildCalloutHtml({
      calloutId,
      name,
      aggregates,
      value,
      grandTotal,
      fontSize,
      labelWidth,
      labelHeight,
      backgroundEnabled: calloutBackgroundEnabled
    }),
    iconSize: [labelWidth, labelHeight],
    iconAnchor: [0, 0]
  })

  const label = L.marker(labelPos, {
    icon: labelIcon,
    draggable: true,
    autoPan: false
  })

  label._calloutId = calloutId
  label._boundaryCenter = center
  label._connectorLine = line
  label._calloutKey = key

  if (calloutPositions) {
    calloutPositions[key] = label.getLatLng()
  }

  label.on('drag', () => {
    const constrainedLatLng = constrainLatLngToMap(label.getLatLng())
    label.setLatLng(constrainedLatLng)
    updateConnectorLine(calloutId, center, line)
  })

  label.on('dragend', () => {
    const constrainedLatLng = constrainLatLngToMap(label.getLatLng())
    label.setLatLng(constrainedLatLng)
    if (calloutPositions) {
      calloutPositions[key] = constrainedLatLng
    }
  })

  marker.addTo(layerGroup)
  line.addTo(layerGroup)
  label.addTo(layerGroup)

  setTimeout(() => {
    if (!mapInstance || !mapElement) return
    updateConnectorLine(calloutId, center, line)
  }, 0)

  return { marker, line, label, calloutId, key }
}
