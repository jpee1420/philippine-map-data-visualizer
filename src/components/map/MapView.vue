<template>
  <div class="map-container">
    <div ref="mapElement" id="map" class="map"></div>
    <div class="map-options-overlay">
      <div class="map-options-card">
        <div class="map-options-row">
          <span class="map-options-label">Color Scale</span>
          <n-select
            v-model:value="colorScheme"
            :options="colorSchemeOptions"
            size="tiny"
          />
        </div>
        <div class="map-options-row">
          <span class="map-options-label">Callout Labels</span>
          <n-switch
            v-model:value="showCallouts"
            size="small"
          />
        </div>
        <div class="map-options-row">
          <span class="map-options-label">Callout Background</span>
          <n-switch
            v-model:value="calloutBackground"
            size="small"
          />
        </div>
      </div>
    </div>

    <div v-if="loading" class="map-loading">
      <n-spin size="large" />
      <p>Loading map...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { NSpin, NSelect, NSwitch } from 'naive-ui'

import L from 'leaflet'
import union from '@turf/union'
import { useDataStore } from '@/store/dataStore'
import { loadGeoJSON } from '@/utils/geoUtils'
import { normalizeLocationName } from '@/utils/nameUtils'
import { BOUNDARY_PATHS, NCR_REGION_NAME } from '@/config/mapConfig'
import { debug } from '@/utils/logger'
import { buildCalloutHtml } from '@/components/map/CalloutDialog.vue'

const dataStore = useDataStore()
const mapElement = ref(null)
const map = ref(null)
const geoLayer = ref(null)
const calloutLayer = ref(null)
const loading = ref(false)
const colorScheme = ref('blue')
const calloutPositions = ref({})

const colorSchemeOptions = [
  { label: 'Blue', value: 'blue' },
  { label: 'Red', value: 'red' },
  { label: 'Green', value: 'green' },
  { label: 'Purple', value: 'purple' },
  { label: 'Orange', value: 'orange' }
]

const showCallouts = computed({
  get: () => dataStore.showCalloutLabels,
  set: (val) => dataStore.setShowCalloutLabels(val)
})

const calloutBackground = computed({
  get: () => dataStore.calloutBackgroundEnabled,
  set: (val) => dataStore.setCalloutBackgroundEnabled(val)
})

watch(colorScheme, (newScheme) => {
  const colorMaps = {
    red: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
    blue: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'],
    green: ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
    purple: ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#756bb1', '#54278f'],
    orange: ['#feedde', '#fdbe85', '#fd8d3c', '#e6550d', '#a63603']
  }
  const newColors = colorMaps[newScheme]
  if (!newColors) return
  dataStore.colorScale = {
    ...dataStore.colorScale,
    colors: newColors
  }
})

const lastFocusZoomed = ref(null) // Track last focus that was zoomed
const userHasMoved = ref(false) // Track if user has manually moved map after auto-fit

// Initialize map
onMounted(async () => {
  loading.value = true
  
  try {
    // Create map instance
    map.value = L.map(mapElement.value, {
      center: [12.8797, 121.7740], // Philippines center
      zoom: 6,
      zoomControl: true,
      minZoom: 5,
      maxZoom: 13,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      maxBoundsViscosity: 0.0,
      preferCanvas: true // Better performance for many features
    })
    
    // Track user manual map movements to prevent unwanted auto-centering
    map.value.on('movestart', (e) => {
      // Only set userHasMoved if the move was initiated by user (not programmatic)
      // Leaflet doesn't provide a direct way to detect this, so we use a flag
      if (!map.value._programmaticMove) {
        userHasMoved.value = true
      }
    })
    
    debug('[MapView] Map initialized successfully')
    
    // Load GeoJSON based on current level
    await loadGeoJSONData()
  } catch (error) {
    console.error('Error initializing map:', error)
  } finally {
    loading.value = false
  }
})

// Load GeoJSON data based on map level
async function loadGeoJSONData() {
  const basePath = import.meta.env.BASE_URL || '/'
  let geoJsonPath = `${basePath}${BOUNDARY_PATHS.country}` // Default to country
  
  // Determine which GeoJSON to load based on map level
  switch (dataStore.mapLevel) {
    case 'country':
      geoJsonPath = `${basePath}${BOUNDARY_PATHS.country}`
      break
    case 'regions':
      geoJsonPath = `${basePath}${BOUNDARY_PATHS.regions}`
      break
    case 'provinces':
      geoJsonPath = `${basePath}${BOUNDARY_PATHS.provinces}`
      break
  }
  
  debug('[MapView] Loading GeoJSON from:', geoJsonPath)
  const geoData = await loadGeoJSON(geoJsonPath)
  debug('[MapView] GeoJSON loaded, features:', geoData?.features?.length)
  
  let filteredGeoData = geoData
  
  if (dataStore.mapLevel === 'regions' && dataStore.mapFocus) {
    const focusRegion = dataStore.mapFocus
    const focusRegionName = normalizeLocationName(focusRegion)
    
    const isNCR = focusRegion.includes(NCR_REGION_NAME)

    if (isNCR) {
      // NCR: derive region outline and subdivisions from ADM3 (cities/municipalities)
      const subdivisionPath = `${basePath}${BOUNDARY_PATHS.cities}`
      
      debug('[MapView] Loading ADM3 for NCR region outline and subdivisions')
      const subdivisionData = await loadGeoJSON(subdivisionPath)

      const allRegionCities = (subdivisionData.features || []).filter(feature => {
        const props = feature.properties || {}
        const regionName = normalizeLocationName(props.ADM1_EN || '')
        return regionName === focusRegionName
      })

      const regionFeature = buildRegionOutlineFeature(allRegionCities, focusRegion)

      let features = []
      if (regionFeature) {
        features.push(regionFeature)
      }

      if (dataStore.selectedSubdivisions && dataStore.selectedSubdivisions.length > 0) {
        const selectedSet = new Set(
          dataStore.selectedSubdivisions.map(code => String(code))
        )
        const selectedSubFeatures = allRegionCities.filter(feature => {
          const props = feature.properties || {}
          const code = String(props.ADM3_PCODE || '')
          return code && selectedSet.has(code)
        })
        features = regionFeature ? [regionFeature, ...selectedSubFeatures] : selectedSubFeatures
      }

      filteredGeoData = {
        ...subdivisionData,
        features
      }
    } else {
      // Non-NCR regions: derive region outline and province subdivisions from ADM2
      const provincePath = `${basePath}${BOUNDARY_PATHS.provinces}`
      
      debug('[MapView] Loading ADM2 for region outline and province subdivisions')
      const provinceData = await loadGeoJSON(provincePath)

      const allRegionProvinces = (provinceData.features || []).filter(feature => {
        const props = feature.properties || {}
        const regionName = normalizeLocationName(props.ADM1_EN || props.NAME_0)
        return regionName === focusRegionName
      })

      const regionFeature = buildRegionOutlineFeature(allRegionProvinces, focusRegion)

      let features = []
      if (regionFeature) {
        features.push(regionFeature)
      }

      if (dataStore.selectedSubdivisions && dataStore.selectedSubdivisions.length > 0) {
        const selectedSet = new Set(
          dataStore.selectedSubdivisions.map(code => String(code))
        )
        const selectedProvinceFeatures = allRegionProvinces.filter(feature => {
          const props = feature.properties || {}
          const code = String(props.ADM2_PCODE || '')
          return code && selectedSet.has(code)
        })
        features = regionFeature ? [regionFeature, ...selectedProvinceFeatures] : selectedProvinceFeatures
      }

      filteredGeoData = {
        ...provinceData,
        features
      }
    }

    debug('[MapView] Filtered region features:', filteredGeoData.features.length)
  } else if (dataStore.mapLevel === 'provinces' && dataStore.mapFocus) {
    const focusProvince = dataStore.mapFocus
    const focusProvinceName = normalizeLocationName(focusProvince)

    // Provinces view: derive province outline and subdivisions from ADM3 (cities/municipalities)
    const subdivisionPath = `${basePath}${BOUNDARY_PATHS.cities}`
    
    debug('[MapView] Loading ADM3 for province outline and subdivisions')
    const subdivisionData = await loadGeoJSON(subdivisionPath)

    const allProvinceCities = (subdivisionData.features || []).filter(feature => {
      const props = feature.properties || {}
      const provName = normalizeLocationName(props.ADM2_EN || props.NAME_1)
      return provName === focusProvinceName
    })

    const provinceFeature = buildProvinceOutlineFeature(allProvinceCities, focusProvince)

    let features = []
    if (provinceFeature) {
      features.push(provinceFeature)
    }

    if (dataStore.selectedSubdivisions && dataStore.selectedSubdivisions.length > 0) {
      const selectedSet = new Set(
        dataStore.selectedSubdivisions.map(code => String(code))
      )
      const selectedSubFeatures = allProvinceCities.filter(feature => {
        const props = feature.properties || {}
        const code = String(props.ADM3_PCODE || '')
        return code && selectedSet.has(code)
      })
      features = provinceFeature ? [provinceFeature, ...selectedSubFeatures] : selectedSubFeatures
      debug('[MapView] Province outline + subdivision features:', features.length)
    } else {
      debug('[MapView] Province outline only (no subdivisions selected)')
    }

    filteredGeoData = {
      ...subdivisionData,
      features
    }
  }
  
  dataStore.setGeoData(filteredGeoData)
  renderGeoJSON(filteredGeoData)
}

// Build a single region outline feature by unioning province/city features
function buildRegionOutlineFeature(features, regionName) {
  if (!features || features.length === 0) return null

  let merged = null

  for (const f of features) {
    if (!f || !f.geometry) continue
    const base = {
      type: 'Feature',
      properties: {},
      geometry: f.geometry
    }
    if (!merged) {
      merged = base
    } else {
      try {
        const u = union(merged, base)
        if (u && u.geometry) {
          merged = u
        }
      } catch (e) {
        console.warn('Union failed for region', regionName, e)
      }
    }
  }

  if (!merged || !merged.geometry) return null

  const firstProps = (features[0] && features[0].properties) || {}
  const regionProps = {
    ADM0_EN: firstProps.ADM0_EN || 'Philippines',
    ADM0_PCODE: firstProps.ADM0_PCODE || 'PH',
    ADM1_EN: regionName,
    ADM1_PCODE: firstProps.ADM1_PCODE || firstProps.ADM1_PCODE
  }

  return {
    type: 'Feature',
    properties: regionProps,
    geometry: merged.geometry
  }
}

// Build a single province outline feature by unioning city/municipality features
function buildProvinceOutlineFeature(features, provinceName) {
  if (!features || features.length === 0) return null

  let merged = null

  for (const f of features) {
    if (!f || !f.geometry) continue
    const base = {
      type: 'Feature',
      properties: {},
      geometry: f.geometry
    }
    if (!merged) {
      merged = base
    } else {
      try {
        const u = union(merged, base)
        if (u && u.geometry) {
          merged = u
        }
      } catch (e) {
        console.warn('Union failed for province', provinceName, e)
      }
    }
  }

  if (!merged || !merged.geometry) return null

  const firstProps = (features[0] && features[0].properties) || {}
  const provProps = {
    ADM0_EN: firstProps.ADM0_EN || 'Philippines',
    ADM0_PCODE: firstProps.ADM0_PCODE || 'PH',
    ADM1_EN: firstProps.ADM1_EN,
    ADM1_PCODE: firstProps.ADM1_PCODE,
    ADM2_EN: provinceName,
    ADM2_PCODE: firstProps.ADM2_PCODE
  }

  return {
    type: 'Feature',
    properties: provProps,
    geometry: merged.geometry
  }
}

// Render GeoJSON with colors
function renderGeoJSON(geoData) {
  debug('[MapView] Rendering GeoJSON, features:', geoData?.features?.length)
  if (!map.value || !geoData) {
    console.warn('Cannot render: map or geoData is null')
    return
  }
  
  // Remove existing layer
  if (geoLayer.value) {
    map.value.removeLayer(geoLayer.value)
  }
  
  // Create new layer
  geoLayer.value = L.geoJSON(geoData, {
    style: (feature) => {
      // For country level without data, show outline only
      if (dataStore.mapLevel === 'country' && !dataStore.selectedMetric) {
        return {
          fillColor: '#e8f4f8',
          weight: 2,
          opacity: 1,
          color: '#2563eb',
          fillOpacity: 0.3
        }
      }
      
      const locationName = getLocationName(feature)
      let fillColor
      
      // If legend field is set, color by category
      if (dataStore.legendField && dataStore.legendCategories.length > 0) {
        let row = dataStore.findRowByLocation(locationName)
        if (!row && dataStore.mapLevel === 'regions' && dataStore.mapFocus) {
          row = dataStore.findRowByLocation(dataStore.mapFocus)
        }
        // No data for this location after filters -> neutral fill
        if (!row) {
          fillColor = '#ffffff'
        } else {
          const selectionActive = Array.isArray(dataStore.legendSelected) && dataStore.legendSelected.length > 0
          const selSet = selectionActive ? new Set(dataStore.legendSelected.map(String)) : null
          const categoryValue = row[dataStore.legendField]
          const inSelection = !selectionActive || (categoryValue != null && selSet.has(String(categoryValue)))
          if (!inSelection) {
            fillColor = '#cccccc'
          } else {
            const categoryIndex = dataStore.legendCategories.indexOf(categoryValue)
            fillColor = getCategoryColor(categoryIndex >= 0 ? categoryIndex : 0)
          }
        }
      } else {
        // Otherwise, color by numeric metric or count-based value
        let value = null

        if (dataStore.selectedMetric) {
          value = dataStore.getValueForLocation(locationName)
          // If no value for subdivision while in region view, use region value
          if ((value === null || isNaN(value)) && dataStore.mapLevel === 'regions' && dataStore.mapFocus) {
            value = dataStore.getValueForLocation(dataStore.mapFocus)
          }
        } else if (Array.isArray(dataStore.valueFields) && dataStore.valueFields.some(v => v && v.agg === 'count')) {
          const aggregates =
            typeof dataStore.getLocationAggregates === 'function'
              ? dataStore.getLocationAggregates(locationName)
              : null
          if (aggregates && aggregates.valueSummaries && aggregates.valueSummaries.length > 0) {
            const countSummary = aggregates.valueSummaries.find(s => s && s.agg === 'count')
            if (countSummary && typeof countSummary.total === 'number') {
              value = countSummary.total
            } else if (typeof aggregates.rowCount === 'number') {
              value = aggregates.rowCount
            }
          }
        }

        // No data for this location after filters -> neutral fill
        if (value === null || isNaN(value)) {
          fillColor = '#ffffff'
        } else {
          fillColor = dataStore.getColorForValue(value)
        }
      }
      
      // Hide internal boundaries if option is enabled
      const borderWeight = dataStore.hideInternalBoundaries ? 0.5 : 1.5
      const borderColor = dataStore.hideInternalBoundaries ? fillColor : '#333333'
      const borderOpacity = dataStore.hideInternalBoundaries ? 0.3 : 0.8
      
      return {
        fillColor: fillColor,
        weight: borderWeight,
        opacity: borderOpacity,
        color: borderColor,
        fillOpacity: 0.7
      }
    },
    onEachFeature: (feature, layer) => {
      const locationName = getLocationName(feature)
      
      // Build tooltip content based on current pivot value fields and filtered data
      let tooltipContent = `<strong>${locationName}</strong><br/>`

      const aggregates =
        typeof dataStore.getLocationAggregates === 'function'
          ? dataStore.getLocationAggregates(locationName)
          : null

      if (aggregates && aggregates.valueSummaries && aggregates.valueSummaries.length > 0) {
        const lines = []

        aggregates.valueSummaries.forEach((summary) => {
          if (!summary || !summary.field) return

          if (summary.agg === 'count') {
            // Categorical count field (e.g. gender)
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
            // Numeric metric field (sum/avg): respect the selected aggregation
            // and show only that value, without separate "Sum:" / "Avg:" labels.
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

        tooltipContent += lines.join('<br/>')
      } else if (dataStore.selectedMetrics && dataStore.selectedMetrics.length > 0) {
        // Fallback: show all selected numeric metrics from a representative row
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

          tooltipContent += metricLines
        } else {
          tooltipContent += 'No data available'
        }
      } else if (dataStore.selectedMetric) {
        // Final fallback: single selected metric from a representative row
        let row = dataStore.findRowByLocation(locationName)
        if (!row && dataStore.mapLevel === 'regions' && dataStore.mapFocus) {
          row = dataStore.findRowByLocation(dataStore.mapFocus)
        }
        const value = row ? parseFloat(row[dataStore.selectedMetric]) : null
        const formatted = value !== null && !isNaN(value)
          ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : 'N/A'
        tooltipContent += `${dataStore.selectedMetric}: ${formatted}`
      } else {
        tooltipContent += 'No data available'
      }
      
      layer.bindTooltip(tooltipContent, { 
        permanent: false, 
        direction: 'top',
        sticky: true,
        className: 'custom-tooltip'
      })
      
      // Hover effects
      layer.on('mouseover', () => {
        layer.setStyle({
          weight: 3,
          fillOpacity: 0.9
        })
      })
      
      layer.on('mouseout', () => {
        const borderWeight = dataStore.hideInternalBoundaries ? 0.5 : 1.5
        layer.setStyle({
          weight: borderWeight,
          fillOpacity: 0.7
        })
      })
    }
  }).addTo(map.value)
  
  debug('[MapView] GeoJSON layer added to map')
  
  // Fit bounds when a region/province is selected and it's different from last zoomed
  const shouldZoom = dataStore.mapFocus && 
                     geoData.features.length > 0 &&
                     lastFocusZoomed.value !== dataStore.mapFocus &&
                     !userHasMoved.value // Don't auto-zoom if user has manually moved
  
  debug('[MapView] Should zoom?', shouldZoom, {
    mapFocus: dataStore.mapFocus,
    features: geoData.features.length,
    lastZoomed: lastFocusZoomed.value,
    userHasMoved: userHasMoved.value
  })
  
  if (shouldZoom) {
    const bounds = geoLayer.value.getBounds()
    debug('[MapView] Fitting bounds for selection:', dataStore.mapFocus)
    debug('[MapView] Bounds:', bounds)
    
    // Calculate appropriate zoom based on bounds size
    const boundsSize = bounds.getNorthEast().distanceTo(bounds.getSouthWest())
    const maxZoom = boundsSize < 100000 ? 11 : 10 // Higher zoom for smaller areas
    
    debug('[MapView] Bounds size:', boundsSize, 'Max zoom:', maxZoom)
    
    // Use setTimeout to ensure layer is fully rendered
    setTimeout(() => {
      // Mark this as a programmatic move to avoid setting userHasMoved flag
      map.value._programmaticMove = true
      
      map.value.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: maxZoom,
        animate: true,
        duration: 0.5
      })
      
      // Reset the flag after animation completes
      setTimeout(() => {
        map.value._programmaticMove = false
      }, 600)
      
      debug('[MapView] fitBounds executed for:', dataStore.mapFocus)
      lastFocusZoomed.value = dataStore.mapFocus
    }, 50)
  }
}

// Render callout diagram labels
function renderCalloutLabels() {
  if (!map.value || !dataStore.geoData) return
  
  // Remove existing callout layer
  if (calloutLayer.value) {
    map.value.removeLayer(calloutLayer.value)
    calloutLayer.value = null
  }
  
  if (!dataStore.showCalloutLabels) return

  // Create a layer group for callouts
  calloutLayer.value = L.layerGroup().addTo(map.value)
  
  // Get top locations to display
  const locationData = []
  // For region view with selected subdivisions, restrict callouts to those subdivisions
  const hasRegionSubdivisions = dataStore.mapLevel === 'regions' &&
    Array.isArray(dataStore.selectedSubdivisions) &&
    dataStore.selectedSubdivisions.length > 0

  const selectedSubdivisionSet = hasRegionSubdivisions
    ? new Set(dataStore.selectedSubdivisions.map(code => String(code)))
    : null

  dataStore.geoData.features.forEach(feature => {
    const props = feature.properties || {}

    // In regions view with checked provinces/cities, skip the parent region feature
    if (hasRegionSubdivisions) {
      const code = String(props.ADM2_PCODE || props.ADM3_PCODE || '')
      if (!code || !selectedSubdivisionSet.has(code)) {
        return
      }
    }

    // In provinces view, skip the synthetic province outline feature itself
    if (dataStore.mapLevel === 'provinces') {
      const hasProvinceName = !!props.ADM2_EN
      const hasCityOrMunicipality = !!props.ADM3_EN
      if (hasProvinceName && !hasCityOrMunicipality) {
        return
      }
    }

    const locationName = getLocationName(feature)

    // Use the same aggregate data as tooltips when available
    let aggregates = null
    if (typeof dataStore.getLocationAggregates === 'function') {
      aggregates = dataStore.getLocationAggregates(locationName)
    }

    let value = null
    if (aggregates && Array.isArray(aggregates.valueSummaries) && aggregates.valueSummaries.length > 0) {
      // Prefer numeric summaries based on their configured aggregation, fall back to counts
      const numericSummary = aggregates.valueSummaries.find(
        (s) => s && s.agg !== 'count'
      )
      if (numericSummary) {
        if (numericSummary.agg === 'avg' && numericSummary.avg != null && !isNaN(numericSummary.avg)) {
          value = numericSummary.avg
        } else if (numericSummary.sum != null && !isNaN(numericSummary.sum)) {
          value = numericSummary.sum
        }
      }
      if (value === null || isNaN(value)) {
        const countSummary = aggregates.valueSummaries.find(
          (s) => s && s.agg === 'count' && typeof s.total === 'number' && !isNaN(s.total)
        )
        if (countSummary) {
          value = countSummary.total
        } else if (typeof aggregates.rowCount === 'number' && !isNaN(aggregates.rowCount)) {
          value = aggregates.rowCount
        }
      }
    } else if (dataStore.selectedMetric) {
      // Fallback: use the map's primary numeric metric if no aggregates are available
      value = dataStore.getValueForLocation(locationName)
    }

    if (value !== null && !isNaN(value)) {
      // Calculate center from feature's geometry bounds
      const center = getFeatureCenter(feature)
      locationData.push({ name: locationName, value, center, feature, aggregates })
    }
  })
  
  if (!locationData.length) return

  // Sort by value and take top locations
  locationData.sort((a, b) => b.value - a.value)

  // Total for percentage calculations across all displayed locations
  const grandTotal = locationData.reduce((sum, loc) => {
    const v = typeof loc.value === 'number' && !isNaN(loc.value) ? loc.value : 0
    return sum + v
  }, 0)
  const hasTotal = grandTotal > 0
  
  // Show callouts for all currently visible features
  // If there are selected subdivisions (e.g., provinces within a region), show those
  // Otherwise, show top 10 by value
  let topLocations
  
  if (locationData.length <= 20) {
    // If viewing a focused region with few features (e.g., provinces in a region), show all
    topLocations = locationData
    debug('[MapView] Showing callouts for all visible features:', topLocations.length)
  } else {
    // Otherwise show top 10 by value
    topLocations = locationData.slice(0, 10)
    debug('[MapView] Showing top 10 callouts by value')
  }
  
  // Get current zoom level (used for label positioning; size is manually resizable)
  const zoom = map.value.getZoom()
  
  // Calculate label positions to avoid overlaps
  const positions = calculateLabelPositions(topLocations, zoom)
  
  // Create callout labels for each location
  topLocations.forEach((location, index) => {
    const { name, value, center, aggregates } = location

    const key = getCalloutKey(name)
    let labelPos = positions[index]
    const savedPos =
      calloutPositions.value && calloutPositions.value[key]
        ? calloutPositions.value[key]
        : null
    if (savedPos && typeof savedPos.lat === 'number' && typeof savedPos.lng === 'number') {
      labelPos = [savedPos.lat, savedPos.lng]
    }
    
    // Base sizes for marker, line and label
    const markerRadius = 4
    const lineWeight = 1
    const fontSize = 1
    const labelWidth = 100
    const labelHeight = 50
    
    // Create marker at actual location center
    const marker = L.circleMarker(center, {
      radius: markerRadius,
      fillColor: '#ff6b35',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    })
    
    // Create line from center to label (will be repositioned to callout edge)
    const line = L.polyline([center, labelPos], {
      color: '#666',
      weight: lineWeight,
      opacity: 0.6,
      dashArray: '5, 5'
    })
    
    // Create unique ID for this callout
    const calloutId = `callout-${index}-${name.replace(/\s+/g, '-')}`
    
    // Create label with zoom-responsive sizing (no extra controls/resize handle)
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
        backgroundEnabled: dataStore.calloutBackgroundEnabled
      }),
      iconSize: [labelWidth, labelHeight],
      iconAnchor: [0, 0]
    })
    
    const label = L.marker(labelPos, { 
      icon: labelIcon,
      draggable: true,
      autoPan: false
    })
    
    // Store reference to update line when dragged and to persist manual positions
    label._calloutId = calloutId
    label._boundaryCenter = center
    label._connectorLine = line
    label._calloutKey = key

    if (!calloutPositions.value) calloutPositions.value = {}
    calloutPositions.value[key] = label.getLatLng()
    
    // Update line when label is dragged
    label.on('drag', () => {
      updateConnectorLine(calloutId, center, line)
    })

    label.on('dragend', () => {
      if (!calloutPositions.value) calloutPositions.value = {}
      calloutPositions.value[key] = label.getLatLng()
    })
    
    // Add to layer group
    marker.addTo(calloutLayer.value)
    line.addTo(calloutLayer.value)
    label.addTo(calloutLayer.value)
    
    // Position connector line so it points to the middle of the callout's left edge
    setTimeout(() => {
      updateConnectorLine(calloutId, center, line)
    }, 0)
  })
}

function getCalloutKey(name) {
  const level = dataStore.mapLevel || 'any'
  const focus = dataStore.mapFocus || 'all'
  return `${level}|${focus}|${name}`
}

// Helper function to update connector line so it points to the middle of the callout's left edge
function updateConnectorLine(calloutId, center, line) {
  if (!map.value || !mapElement.value) return

  const mapInstance = map.value
  const mapEl = mapElement.value
  const element = document.querySelector(`[data-callout-id="${calloutId}"]`)
  if (!element) return

  const mapRect = mapEl.getBoundingClientRect()
  const rect = element.getBoundingClientRect()

  const x = rect.left - mapRect.left
  const y = rect.top - mapRect.top + rect.height / 2

  const edgeLatLng = mapInstance.containerPointToLatLng([x, y])
  line.setLatLngs([center, edgeLatLng])
}

function refreshConnectorLines() {
  if (!map.value || !calloutLayer.value) return

  calloutLayer.value.eachLayer((layer) => {
    if (layer && layer._calloutId && layer._boundaryCenter && layer._connectorLine) {
      updateConnectorLine(layer._calloutId, layer._boundaryCenter, layer._connectorLine)
    }
  })
}

// Helper function to calculate label positions to avoid overlaps
function calculateLabelPositions(locations, zoom) {
  const positions = []
  const mapBounds = map.value.getBounds()
  
  // Use the center of the visible features as reference point
  // If there's a single focused location, use its bounds
  let referenceCenter
  if (locations.length === 1 && locations[0].feature) {
    // For single focused location, use the feature's bounds
    const featureBounds = L.geoJSON(locations[0].feature).getBounds()
    referenceCenter = featureBounds.getCenter()
  } else {
    // For multiple locations, use map center
    referenceCenter = map.value.getCenter()
  }
  
  // Base offset distance (scales with zoom)
  const latSpan = Math.abs(mapBounds.getNorth() - mapBounds.getSouth())
  const lngSpan = Math.abs(mapBounds.getEast() - mapBounds.getWest())
  const baseLatOffset = latSpan * 0.18 || 0.5
  const baseLngOffset = lngSpan * 0.18 || 0.5
  
  locations.forEach((location, index) => {
    const center = location.center
    
    // Calculate offset direction based on position relative to reference center
    let offsetLat = 0
    let offsetLng = baseLngOffset
    
    // Position labels around the location based on its position
    if (center[0] > referenceCenter.lat) {
      offsetLat = baseLatOffset // North
    } else {
      offsetLat = -baseLatOffset // South
    }
    
    if (center[1] < referenceCenter.lng) {
      offsetLng = -baseLngOffset // West
    }
    
    // Alternate positions for consecutive items to reduce overlap
    if (index % 2 === 1) {
      offsetLat *= -1
    }
    
    const labelPos = [center[0] + offsetLat, center[1] + offsetLng]
    positions.push(labelPos)
  })
  
  return positions
}

// Helper function to get location name from feature properties
// Prefer ADM*_EN fields from phl_admbnda, fall back to older NAME_* and other props
function getLocationName(feature) {
  const props = feature.properties || {}
  const rawName =
    props.ADM3_EN ||
    props.ADM2_EN ||
    props.ADM1_EN ||
    props.ADM0_EN ||
    props.NAME_2 ||
    props.NAME_1 ||
    props.NAME_0 ||
    props.COUNTRY ||
    props.shapeName ||
    props.shapeGroup ||
    props.shapeID ||
    props.name ||
    props.region ||
    props.province ||
    props.city ||
    ''

  return normalizeLocationName(rawName) || 'Unknown'
}

// Helper function to calculate center of a single feature's geometry
// Uses centroid calculation for better accuracy on irregular shapes
function getFeatureCenter(feature) {
  if (!feature || !feature.geometry) {
    return [12.8797, 121.7740] // Default to Philippines center
  }
  
  let totalLat = 0
  let totalLng = 0
  let pointCount = 0
  
  const processCoordinates = (coords) => {
    coords.forEach(coord => {
      const [lng, lat] = coord
      totalLat += lat
      totalLng += lng
      pointCount++
    })
  }
  
  if (feature.geometry.type === 'Polygon') {
    // Polygon has array of rings, use first ring (outer boundary)
    processCoordinates(feature.geometry.coordinates[0])
  } else if (feature.geometry.type === 'MultiPolygon') {
    // MultiPolygon has array of polygons, process all
    feature.geometry.coordinates.forEach(polygon => {
      processCoordinates(polygon[0])
    })
  }
  
  if (pointCount === 0) {
    return [12.8797, 121.7740] // Fallback
  }
  
  // Return centroid (average of all points) [lat, lng]
  return [totalLat / pointCount, totalLng / pointCount]
}

// Category colors for legend field (same as Legend component)
const categoryColors = [
  '#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a',
  '#fee140', '#30cfd0', '#a8edea', '#fbc2eb', '#fdcbf1',
  '#e0c3fc', '#8ec5fc', '#f5576c', '#ffa751', '#4facfe'
]

function getCategoryColor(index) {
  return categoryColors[index % categoryColors.length]
}

// Helper function to update layer colors
function updateLayerColors() {
  if (dataStore.geoData && geoLayer.value) {
    geoLayer.value.eachLayer((layer) => {
      if (layer.feature) {
        const locationName = getLocationName(layer.feature)
        let fillColor
        
        // If legend field is set, color by category
        if (dataStore.legendField && dataStore.legendCategories.length > 0) {
          let row = dataStore.findRowByLocation(locationName)
          if (!row && dataStore.mapLevel === 'regions' && dataStore.mapFocus) {
            row = dataStore.findRowByLocation(dataStore.mapFocus)
          }
          // No data for this location after filters -> neutral fill
          if (!row) {
            fillColor = '#ffffff'
          } else {
            const selectionActive = Array.isArray(dataStore.legendSelected) && dataStore.legendSelected.length > 0
            const selSet = selectionActive ? new Set(dataStore.legendSelected.map(String)) : null
            const categoryValue = row[dataStore.legendField]
            const inSelection = !selectionActive || (categoryValue != null && selSet.has(String(categoryValue)))
            if (!inSelection) {
              fillColor = '#cccccc'
            } else {
              const categoryIndex = dataStore.legendCategories.indexOf(categoryValue)
              fillColor = getCategoryColor(categoryIndex >= 0 ? categoryIndex : 0)
            }
          }
        } else {
          // Otherwise, color by numeric metric or count-based value
          let value = null

          if (dataStore.selectedMetric) {
            value = dataStore.getValueForLocation(locationName)
            if ((value === null || isNaN(value)) && dataStore.mapLevel === 'regions' && dataStore.mapFocus) {
              value = dataStore.getValueForLocation(dataStore.mapFocus)
            }
          } else if (Array.isArray(dataStore.valueFields) && dataStore.valueFields.some(v => v && v.agg === 'count')) {
            const aggregates =
              typeof dataStore.getLocationAggregates === 'function'
                ? dataStore.getLocationAggregates(locationName)
                : null
            if (aggregates && aggregates.valueSummaries && aggregates.valueSummaries.length > 0) {
              const countSummary = aggregates.valueSummaries.find(s => s && s.agg === 'count')
              if (countSummary && typeof countSummary.total === 'number') {
                value = countSummary.total
              } else if (typeof aggregates.rowCount === 'number') {
                value = aggregates.rowCount
              }
            }
          }

          // No data for this location after filters -> neutral fill
          if (value === null || isNaN(value)) {
            fillColor = '#ffffff'
          } else {
            fillColor = dataStore.getColorForValue(value)
          }
        }
        
        layer.setStyle({ fillColor })
      }
    })
  }
}

// Helper function to update tooltips based on current pivot configuration
function updateLayerTooltips() {
  if (dataStore.geoData && geoLayer.value) {
    geoLayer.value.eachLayer((layer) => {
      if (!layer.feature) return

      const locationName = getLocationName(layer.feature)
      let tooltipContent = `<strong>${locationName}</strong><br/>`

      const aggregates =
        typeof dataStore.getLocationAggregates === 'function'
          ? dataStore.getLocationAggregates(locationName)
          : null

      if (aggregates && aggregates.valueSummaries && aggregates.valueSummaries.length > 0) {
        const lines = []

        aggregates.valueSummaries.forEach((summary) => {
          if (!summary || !summary.field) return

          if (summary.agg === 'count') {
            // Categorical count field (e.g. gender)
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
            // Numeric metric field (sum/avg): respect selected aggregation and
            // show only that value, mirroring callout behavior.
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

        tooltipContent += lines.join('<br/>')
      } else if (dataStore.selectedMetrics && dataStore.selectedMetrics.length > 0) {
        // Fallback: show all selected numeric metrics from a representative row
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

          tooltipContent += metricLines
        } else {
          tooltipContent += 'No data available'
        }
      } else if (dataStore.selectedMetric) {
        // Final fallback: single selected metric from a representative row
        let row = dataStore.findRowByLocation(locationName)
        if (!row && dataStore.mapLevel === 'regions' && dataStore.mapFocus) {
          row = dataStore.findRowByLocation(dataStore.mapFocus)
        }
        const value = row ? parseFloat(row[dataStore.selectedMetric]) : null
        const formatted = value !== null && !isNaN(value)
          ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : 'N/A'
        tooltipContent += `${dataStore.selectedMetric}: ${formatted}`
      } else {
        tooltipContent += 'No data available'
      }

      layer.unbindTooltip()
      layer.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'top',
        sticky: true,
        className: 'custom-tooltip'
      })
    })
  }
}

const refreshLayerColorsAndTooltips = () => {
  updateLayerColors()
  updateLayerTooltips()
}

const refreshLayerVisuals = () => {
  refreshLayerColorsAndTooltips()
  if (dataStore.showCalloutLabels) {
    renderCalloutLabels()
  }
}

// Watch for data changes - only re-render colors, don't reload GeoJSON
watch(() => dataStore.filteredData, refreshLayerVisuals)
watch(() => dataStore.valueFields, refreshLayerVisuals, { deep: true })
watch(() => dataStore.selectedMetrics, refreshLayerVisuals, { deep: true })
watch(() => dataStore.selectedMetric, refreshLayerVisuals)
watch(() => dataStore.legendField, refreshLayerVisuals)
watch(() => dataStore.legendCategories, refreshLayerVisuals, { deep: true })

// Watch for map level changes to reload appropriate GeoJSON
watch(() => dataStore.mapLevel, async () => {
  debug('[MapView] Map level changed to:', dataStore.mapLevel)
  calloutPositions.value = {}
  await loadGeoJSONData()
  if (dataStore.showCalloutLabels && dataStore.geoData) {
    renderCalloutLabels()
  }
})

// Watch for map focus changes to filter features
watch(() => dataStore.mapFocus, async (newFocus, oldFocus) => {
  debug('[MapView] Map focus changed:', oldFocus, '->', newFocus)
  // Reset flags when focus changes to allow auto-zoom on new selection
  if (newFocus !== oldFocus) {
    lastFocusZoomed.value = null
    userHasMoved.value = false // Reset to allow auto-zoom on new selection
  }
  calloutPositions.value = {}
  await loadGeoJSONData()
  if (dataStore.showCalloutLabels && dataStore.geoData) {
    renderCalloutLabels()
  }
})

// Watch for selected subdivisions changes to update boundaries
watch(() => dataStore.selectedSubdivisions, async () => {
  debug('[MapView] Selected subdivisions changed:', dataStore.selectedSubdivisions)
  calloutPositions.value = {}
  await loadGeoJSONData()
  if (dataStore.showCalloutLabels && dataStore.geoData) {
    renderCalloutLabels()
  }
}, { deep: true })

// Watch for callout labels changes
watch(() => dataStore.showCalloutLabels, () => {
  if (dataStore.geoData) {
    renderCalloutLabels()
  }
})

// Watch for callout background toggle to update existing labels immediately
watch(() => dataStore.calloutBackgroundEnabled, () => {
  if (!dataStore.showCalloutLabels) return

  const elements = document.querySelectorAll('.callout-content')
  elements.forEach((element) => {
    if (dataStore.calloutBackgroundEnabled) {
      element.style.background = 'rgba(255, 255, 255, 0.96)'
      element.style.border = '1px solid rgba(148, 163, 184, 0.8)'
      element.style.boxShadow = '0 6px 18px rgba(15, 23, 42, 0.24)'
    } else {
      element.style.background = 'transparent'
      element.style.border = 'none'
      element.style.boxShadow = 'none'
    }
  })
})

// Watch for color scale changes to update map immediately
watch(() => dataStore.colorScale, () => {
  if (dataStore.geoData) {
    refreshLayerColorsAndTooltips()
  }
}, { deep: true })

// Watch for zoom changes to update callout sizes
watch(() => map.value, (newMap) => {
  if (newMap) {
    newMap.on('move', () => {
      refreshConnectorLines()
    })
  }
}, { immediate: true })
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;

  min-height: 500px;
  background: #f8f9fa;
}

.map-options-overlay {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 500;
  pointer-events: none;
}

.map-options-card {
  pointer-events: auto;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 8px 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
}

.map-options-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.map-options-label {
  font-size: 11px;
  color: #4b5563;
}

.map,
#map {
  width: 100%;
  height: 100%;
  min-height: 500px;
  z-index: 1;
  background: #f8f9fa;
}

.map-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
  padding: 20px 40px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.map-loading p {
  margin-top: 10px;
  color: #666;
}
</style>

<style>
/* Callout label styles (not scoped to work with Leaflet) */
.callout-label {
  background: transparent !important;
  border: none !important;
}

.callout-content {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 4px 6px;
  box-shadow: none;
  font-family: Arial, sans-serif;
  min-width: 100px;
  position: relative;
  cursor: default;
  transition: opacity 0.2s;
}

.callout-content:hover {
  opacity: 0.95;
}

.callout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.callout-name {
  font-weight: bold;
  font-size: 11px;
  color: #333;
  flex: 1;
}

.callout-controls {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.callout-btn {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  transition: all 0.2s;
}

.callout-btn:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.callout-metrics {
  margin-top: 1px;
}

.resize-handle {
  position: absolute;
  background: rgba(148, 163, 184, 0.8);
  border-radius: 999px;
  z-index: 2;
}

.resize-handle-right {
  top: 50%;
  right: -4px;
  width: 6px;
  height: 24px;
  transform: translateY(-50%);
  cursor: ew-resize;
}

.resize-handle-bottom {
  left: 50%;
  bottom: -4px;
  width: 24px;
  height: 6px;
  transform: translateX(-50%);
  cursor: ns-resize;
}

.resize-handle-corner {
  right: -4px;
  bottom: -4px;
  width: 10px;
  height: 10px;
  cursor: nwse-resize;
}

.callout-value {
  font-size: 12px;
  font-weight: bold;
  color: #2563eb;
  margin-bottom: 4px;
}

.callout-metric {
  font-size: 11px;
  color: #444;
  margin: 2px 0;
  display: flex;
  justify-content: flex-start;
  gap: 2px;
}

.callout-metric .metric-name {
  color: #666;
  font-weight: 500;
}

.callout-metric .metric-value {
  color: #2563eb;
  font-weight: 600;
  margin-left: 4px;
}

.callout-breakdown {
  font-size: 11px;
  color: #666;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* .callout-breakdown .male {
  color: #3b82f6;
}

.callout-breakdown .female {
  color: #ec4899;
} */
</style>