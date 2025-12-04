<template>
  <div class="map-container">
    <div ref="mapElement" id="map" class="map"></div>
    <div class="map-options-overlay">
      <div class="map-options-card" :class="{ 'is-collapsed': isOptionsCollapsed }">
        <div class="map-options-header">
          <span class="map-options-title">Map Options</span>
          <button
            type="button"
            class="map-options-toggle"
            @click="isOptionsCollapsed = !isOptionsCollapsed"
          >
            {{ isOptionsCollapsed ? 'Show' : 'Hide' }}
          </button>
        </div>
        <div v-if="!isOptionsCollapsed" class="map-options-row">
          <span class="map-options-label">Color Scale</span>
          <n-select
            v-model:value="colorScheme"
            :options="colorSchemeOptions"
            size="tiny"
          />
        </div>
        <div v-if="!isOptionsCollapsed" class="map-options-row">
          <span class="map-options-label">Callout Labels</span>
          <n-switch
            v-model:value="showCallouts"
            size="small"
          />
        </div>
        <div v-if="!isOptionsCollapsed" class="map-options-row">
          <span class="map-options-label">Callout Background</span>
          <n-switch
            v-model:value="calloutBackground"
            size="small"
          />
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="map-loading">
      <n-spin size="large" />
      <p>Loading map...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { NSpin, NSelect, NSwitch } from 'naive-ui'

import L from 'leaflet'
import union from '@turf/union'
import { forceSimulation, forceCollide, forceX, forceY } from 'd3-force'
import { useDataStore } from '@/store/dataStore'
import { loadGeoJSON } from '@/utils/geoUtils'
import { normalizeLocationName } from '@/utils/nameUtils'
import { BOUNDARY_PATHS, NCR_REGION_NAME } from '@/config/mapConfig'
import { COLOR_MAPS, COLOR_SCHEME_OPTIONS } from '@/config/colorMaps'
import { useMapControls } from '@/composables/useMapControls'

import { debug } from '@/utils/logger'
import { buildCalloutHtml } from '@/components/map/CalloutDialog.vue'

const dataStore = useDataStore()
const mapElement = ref(null)

// Use map controls composable for map instance and interaction tracking
const {
  map,
  isLoading,
  lastFocusZoomed,
  hasUserMoved,
  initializeMap,
  fitBoundsProgrammatic
} = useMapControls()

const geoLayer = ref(null)
const calloutLayer = ref(null)
const colorScheme = ref('blue')
const calloutPositions = ref({})
const isOptionsCollapsed = ref(false)

// Use color scheme options from config
const colorSchemeOptions = COLOR_SCHEME_OPTIONS

const showCallouts = computed({
  get: () => dataStore.showCalloutLabels,
  set: (val) => dataStore.setShowCalloutLabels(val)
})

const calloutBackground = computed({
  get: () => dataStore.calloutBackgroundEnabled,
  set: (val) => dataStore.setCalloutBackgroundEnabled(val)
})

watch(colorScheme, (newScheme) => {
  const newColors = COLOR_MAPS[newScheme]
  if (!newColors) return
  dataStore.colorScale.colors = newColors
  dataStore.updateColorScale()
})

// Initialize map using composable
onMounted(async () => {
  isLoading.value = true
  
  try {
    initializeMap(mapElement.value)
    debug('[MapView] Map initialized successfully')
    
    // Register map event listeners for collision layout updates
    if (map.value) {
      map.value.on('zoomend', debouncedCollisionUpdate)
      map.value.on('moveend', debouncedCollisionUpdate)
      map.value.on('resize', debouncedCollisionUpdate)
    }
    
    // Load GeoJSON based on current level
    await loadGeoJSONData()
  } catch (error) {
    console.error('Error initializing map:', error)
  } finally {
    isLoading.value = false
  }
})

// Cleanup map event listeners on unmount
onUnmounted(() => {
  if (map.value) {
    map.value.off('zoomend', debouncedCollisionUpdate)
    map.value.off('moveend', debouncedCollisionUpdate)
    map.value.off('resize', debouncedCollisionUpdate)
  }
  if (collisionUpdateTimeout) {
    clearTimeout(collisionUpdateTimeout)
  }
})

// Load GeoJSON data based on map level
async function loadGeoJSONData() {
  const basePath = import.meta.env.BASE_URL || '/'
  let geoJsonPath = `${basePath}${BOUNDARY_PATHS.regions}` // Default to regions

  // Determine which GeoJSON to load based on map level
  switch (dataStore.mapLevel) {
    case 'regions':
      geoJsonPath = `${basePath}${BOUNDARY_PATHS.regions}`
      break
    case 'provinces':
      geoJsonPath = `${basePath}${BOUNDARY_PATHS.provinces}`
      break
  }
  
  const geoData = await loadGeoJSON(geoJsonPath)
  
  let filteredGeoData = geoData
  
  if (dataStore.mapLevel === 'regions' && dataStore.mapFocus) {
    const focusRegion = dataStore.mapFocus
    const focusRegionName = normalizeLocationName(focusRegion)
    
    const isNCR = focusRegion.includes(NCR_REGION_NAME)

    if (isNCR) {
      // NCR: derive region outline and subdivisions from ADM3 (cities/municipalities)
      const subdivisionPath = `${basePath}${BOUNDARY_PATHS.cities}`
      
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
  } else if (dataStore.mapLevel === 'provinces' && dataStore.mapFocus) {
    const focusProvince = dataStore.mapFocus
    const focusProvinceName = normalizeLocationName(focusProvince)

    // Provinces view: derive province outline and subdivisions from ADM3 (cities/municipalities)
    const subdivisionPath = `${basePath}${BOUNDARY_PATHS.cities}`
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
  if (!map.value || !geoData) {
    console.warn('Cannot render: map or geoData is null')
    return
  }
  
  // Remove existing layer - unbind tooltips first to prevent animation errors
  if (geoLayer.value) {
    geoLayer.value.eachLayer(layer => {
      if (layer.unbindTooltip) layer.unbindTooltip()
    })
    map.value.removeLayer(geoLayer.value)
  }
  
  // Create new layer
  geoLayer.value = L.geoJSON(geoData, {
    style: (feature) => {
      const locationName = getLocationName(feature)
      const props = feature.properties || {}
      let fillColor
      
      // Determine strict match level based on feature properties
      // This ensures cities only match city data, provinces only match province data, etc.
      let strictLevel = null
      if (props.ADM3_EN) {
        strictLevel = 'city' // This is a city/municipality feature
      } else if (props.ADM2_EN) {
        strictLevel = 'province' // This is a province feature
      } else if (props.ADM1_EN) {
        strictLevel = 'region' // This is a region feature
      }
      
      // Color by numeric metric or count-based value
      let value = null

      if (dataStore.selectedMetric) {
        value = dataStore.getValueForLocation(locationName)
        // If no value for subdivision while in region view, use region value
        if ((value === null || isNaN(value)) && dataStore.mapLevel === 'regions' && dataStore.mapFocus) {
          value = dataStore.getValueForLocation(dataStore.mapFocus)
        }
      } else if (Array.isArray(dataStore.valueFields) && dataStore.valueFields.length > 0) {
        const aggregates =
          typeof dataStore.getLocationAggregates === 'function'
            ? dataStore.getLocationAggregates(locationName, strictLevel)
            : null
        if (aggregates && aggregates.valueSummaries && aggregates.valueSummaries.length > 0) {
          const countSummary = aggregates.valueSummaries.find(s => s && s.agg === 'count')
          if (countSummary && typeof countSummary.total === 'number') {
            value = countSummary.total
          } else {
            // Try sum or avg from numeric summaries
            const numericSummary = aggregates.valueSummaries.find(s => s && s.agg !== 'count')
            if (numericSummary) {
              value = numericSummary.agg === 'avg' ? numericSummary.avg : numericSummary.sum
            }
          }
        }
        // Fallback to row count if no specific summary
        if ((value === null || isNaN(value)) && aggregates && typeof aggregates.rowCount === 'number') {
          value = aggregates.rowCount
        }
      }

      // No data for this location after filters -> white fill
      if (value === null || isNaN(value) || value === 0) {
        fillColor = '#ffffff'
      } else {
        fillColor = dataStore.getColorForValue(value)
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
      const tooltipContent = buildTooltipContent(locationName)
      
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
  
  // Fit bounds when a region/province is selected and it's different from last zoomed
  const shouldZoom = dataStore.mapFocus && 
                     geoData.features.length > 0 &&
                     lastFocusZoomed.value !== dataStore.mapFocus &&
                     !hasUserMoved.value // Don't auto-zoom if user has manually moved
  
  if (shouldZoom) {
    const bounds = geoLayer.value.getBounds()
    
    // Calculate appropriate zoom based on bounds size
    const boundsSize = bounds.getNorthEast().distanceTo(bounds.getSouthWest())
    const maxZoom = boundsSize < 100000 ? 11 : 10 // Higher zoom for smaller areas
    
    // Use setTimeout to ensure layer is fully rendered, then fit bounds programmatically
    setTimeout(() => {
      fitBoundsProgrammatic(bounds, { maxZoom })
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
      // For NCR, subdivisions are ADM3 (cities/municipalities), so check ADM3_PCODE first
      // For other regions, subdivisions are ADM2 (provinces)
      const adm3Code = props.ADM3_PCODE ? String(props.ADM3_PCODE) : ''
      const adm2Code = props.ADM2_PCODE ? String(props.ADM2_PCODE) : ''
      const code = adm3Code || adm2Code
      // Check if either code is in the selected set (handles both NCR ADM3 and regular ADM2)
      const isSelected = (adm3Code && selectedSubdivisionSet.has(adm3Code)) || 
                         (adm2Code && selectedSubdivisionSet.has(adm2Code))
      if (!code || !isSelected) {
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
      const numericSummary = aggregates.valueSummaries.find(s => s && s.agg !== 'count')
      if (numericSummary) {
        if (numericSummary.agg === 'avg' && numericSummary.avg != null && !isNaN(numericSummary.avg)) {
          value = numericSummary.avg
        } else if (numericSummary.sum != null && !isNaN(numericSummary.sum)) {
          value = numericSummary.sum
        }
      }
      if (value === null || isNaN(value)) {
        const countSummary = aggregates.valueSummaries.find(s => s && s.agg === 'count')
        if (countSummary) {
          value = countSummary.total
        } else if (typeof aggregates.rowCount === 'number' && !isNaN(aggregates.rowCount)) {
          value = aggregates.rowCount
        }
      }
    } else if (aggregates && typeof aggregates.rowCount === 'number' && aggregates.rowCount > 0) {
      // Fallback: use row count if aggregates exist but no valueSummaries
      value = aggregates.rowCount
    } else if (dataStore.selectedMetric) {
      // Fallback: use the map's primary numeric metric if no aggregates are available
      value = dataStore.getValueForLocation(locationName)
    }

    // Show callout if we have any value, including 0 for locations with rows but no counts
    if (value !== null && !isNaN(value) && value > 0) {
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
  } else {
    // Otherwise show top 10 by value
    topLocations = locationData.slice(0, 10)
  }
  
  // Get current zoom level (used for label positioning; size is manually resizable)
  const zoom = map.value.getZoom()
  
  // Calculate label positions to avoid overlaps and stay within map bounds
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
    
    // Get zoom-responsive sizes
    const responsiveSize = getZoomResponsiveSize(zoom)
    const labelWidth = responsiveSize.width
    const labelHeight = responsiveSize.height
    const fontSize = responsiveSize.fontSize
    const markerRadius = responsiveSize.markerRadius
    const lineWeight = Math.max(1, Math.round(responsiveSize.fontSize))
    
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

// Collision radius for D3 force simulation (pixels)
const COLLISION_RADIUS_PX = 50

// Base callout dimensions (at zoom level 8)
const BASE_CALLOUT_WIDTH = 120
const BASE_CALLOUT_HEIGHT = 50
const BASE_MARKER_RADIUS = 4
const BASE_FONT_SIZE = 1
const REFERENCE_ZOOM = 8

/**
 * Calculate zoom-responsive callout dimensions
 * Closer zoom (higher number) = smaller callouts
 * Farther zoom (lower number) = larger callouts
 * 
 * @param {number} zoom - Current map zoom level
 * @returns {Object} { width, height, fontSize, markerRadius }
 */
function getZoomResponsiveSize(zoom) {
  // Scale factor: inversely proportional to zoom
  // At zoom 8 (reference), scale = 1
  // At zoom 12 (close), scale = 0.6
  // At zoom 5 (far), scale = 1.4
  const scaleFactor = Math.max(0.5, Math.min(1.6, REFERENCE_ZOOM / zoom))
  
  return {
    width: Math.round(BASE_CALLOUT_WIDTH * scaleFactor),
    height: Math.round(BASE_CALLOUT_HEIGHT * scaleFactor),
    fontSize: BASE_FONT_SIZE * scaleFactor,
    markerRadius: Math.max(2, Math.round(BASE_MARKER_RADIUS * scaleFactor))
  }
}

/**
 * D3 Force-based collision avoidance for callout labels
 * Treats each callout as a node and uses force simulation to prevent overlaps
 * 
 * @param {Array} locations - Array of location objects with center [lat, lng]
 * @param {Object} options - Configuration options
 * @param {number} options.collisionRadius - Collision radius in pixels (default: 50)
 * @param {number} options.iterations - Number of simulation iterations (default: 150)
 * @param {number} options.strength - Force strength for returning to original position (default: 0.5)
 * @returns {Array} Array of adjusted [lat, lng] positions
 */
function applyCollisionAvoidance(locations, options = {}) {
  if (!map.value || !locations || locations.length === 0) {
    return locations.map(loc => loc.center)
  }

  const {
    collisionRadius = COLLISION_RADIUS_PX,
    iterations = 150,
    strength = 0.5
  } = options

  const mapInstance = map.value

  // Step 1: Convert each location to a node with pixel coordinates
  const nodes = locations.map((location, index) => {
    const center = location.center
    const anchor = L.latLng(center[0], center[1])
    const point = mapInstance.latLngToLayerPoint(anchor)
    
    return {
      id: location.name || `node-${index}`,
      index,
      anchor,
      // Original pixel position (target for forces)
      xOriginal: point.x,
      yOriginal: point.y,
      // Current position (will be adjusted by simulation)
      x: point.x,
      y: point.y
    }
  })

  // Get map container bounds in layer points for constraining
  const mapSize = mapInstance.getSize()
  const padding = collisionRadius // Padding from edges
  const minX = padding
  const maxX = mapSize.x - padding
  const minY = padding
  const maxY = mapSize.y - padding

  // Step 2: Run D3 force simulation
  const simulation = forceSimulation(nodes)
    // Collision force - prevents overlap
    .force('collide', forceCollide()
      .radius(collisionRadius)
      .strength(0.8)
      .iterations(3)
    )
    // X force - pulls nodes back toward original X position
    .force('x', forceX(d => d.xOriginal).strength(strength))
    // Y force - pulls nodes back toward original Y position  
    .force('y', forceY(d => d.yOriginal).strength(strength))
    // Stop auto-ticking, we'll manually tick
    .stop()

  // Run simulation for specified iterations
  for (let i = 0; i < iterations; i++) {
    simulation.tick()
    
    // After each tick, constrain nodes to map bounds
    nodes.forEach(node => {
      node.x = Math.max(minX, Math.min(maxX, node.x))
      node.y = Math.max(minY, Math.min(maxY, node.y))
    })
  }

  // Step 3: Convert adjusted pixel positions back to geographic coordinates
  // Also apply final bounds check
  const adjustedPositions = nodes.map(node => {
    // Final bounds constraint
    const constrainedX = Math.max(minX, Math.min(maxX, node.x))
    const constrainedY = Math.max(minY, Math.min(maxY, node.y))
    const adjustedPoint = L.point(constrainedX, constrainedY)
    const adjustedLatLng = mapInstance.layerPointToLatLng(adjustedPoint)
    return [adjustedLatLng.lat, adjustedLatLng.lng]
  })

  return adjustedPositions
}

// ... (rest of the code remains the same)
/**
 * Calculate label positions using D3 force collision avoidance
 * This replaces the old radial distribution approach with physics-based positioning
 */
function calculateLabelPositions(locations, zoom) {
  // Use collision avoidance with zoom-responsive radius
  // Smaller radius at higher zoom (more detail), larger at lower zoom
  const baseRadius = COLLISION_RADIUS_PX
  const zoomFactor = Math.max(0.5, Math.min(1.5, zoom / 8))
  const adjustedRadius = baseRadius / zoomFactor

  return applyCollisionAvoidance(locations, {
    collisionRadius: adjustedRadius,
    iterations: 150,
    strength: 0.4
  })
}

/**
 * Update collision layout when map view changes
 * Called on zoom, move, and resize events
 */
function updateCollisionLayout() {
  if (!dataStore.showCalloutLabels || !calloutLayer.value) return
  
  // Re-render callouts with new positions based on current view
  renderCalloutLabels()
}

// Debounce helper to prevent excessive recalculations
let collisionUpdateTimeout = null
function debouncedCollisionUpdate() {
  if (collisionUpdateTimeout) {
    clearTimeout(collisionUpdateTimeout)
  }
  collisionUpdateTimeout = setTimeout(() => {
    updateCollisionLayout()
  }, 100)
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

// Helper function to update layer colors
function updateLayerColors() {
  if (dataStore.geoData && geoLayer.value) {
    geoLayer.value.eachLayer((layer) => {
      if (layer.feature) {
        const locationName = getLocationName(layer.feature)
        let fillColor
        
        // Color by numeric metric or count-based value
        let value = null

        if (dataStore.selectedMetric) {
          value = dataStore.getValueForLocation(locationName)
        } else if (Array.isArray(dataStore.valueFields) && dataStore.valueFields.length > 0) {
          const aggregates =
            typeof dataStore.getLocationAggregates === 'function'
              ? dataStore.getLocationAggregates(locationName)
              : null
          if (aggregates && aggregates.valueSummaries && aggregates.valueSummaries.length > 0) {
            const countSummary = aggregates.valueSummaries.find(s => s && s.agg === 'count')
            if (countSummary && typeof countSummary.total === 'number') {
              value = countSummary.total
            } else {
              // Try sum or avg from numeric summaries
              const numericSummary = aggregates.valueSummaries.find(s => s && s.agg !== 'count')
              if (numericSummary) {
                value = numericSummary.agg === 'avg' ? numericSummary.avg : numericSummary.sum
              }
            }
          }
          // Fallback to row count if no specific summary
          if ((value === null || isNaN(value)) && aggregates && typeof aggregates.rowCount === 'number') {
            value = aggregates.rowCount
          }
        }

        // No data for this location after filters -> white fill
        if (value === null || isNaN(value) || value === 0) {
          fillColor = '#ffffff'
        } else {
          fillColor = dataStore.getColorForValue(value)
        }
        
        layer.setStyle({ fillColor })
      }
    })
  }
}

// Helper function to build tooltip content
function buildTooltipContent(locationName) {
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

    return `<strong>${locationName}</strong><br/>${lines.join('<br/>')}`
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

      return `<strong>${locationName}</strong><br/>${metricLines}`
    } else {
      return `<strong>${locationName}</strong><br/>No data available`
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
    return `<strong>${locationName}</strong><br/>${dataStore.selectedMetric}: ${formatted}`
  } else {
    return `<strong>${locationName}</strong><br/>No data available`
  }
}

// Helper function to update tooltips based on current pivot configuration
function updateLayerTooltips() {
  if (dataStore.geoData && geoLayer.value) {
    geoLayer.value.eachLayer((layer) => {
      if (!layer.feature) return

      const locationName = getLocationName(layer.feature)
      const tooltipContent = buildTooltipContent(locationName)

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

// Watch for map level changes to reload appropriate GeoJSON
watch(() => dataStore.mapLevel, async () => {
  calloutPositions.value = {}
  await loadGeoJSONData()
  if (dataStore.showCalloutLabels && dataStore.geoData) {
    renderCalloutLabels()
  }
})

// Watch for map focus changes to filter features
watch(() => dataStore.mapFocus, async (newFocus, oldFocus) => {
  // Reset flags when focus changes to allow auto-zoom on new selection
  if (newFocus !== oldFocus) {
    lastFocusZoomed.value = null
    hasUserMoved.value = false // Reset to allow auto-zoom on new selection
  }
  calloutPositions.value = {}
  await loadGeoJSONData()
  if (dataStore.showCalloutLabels && dataStore.geoData) {
    renderCalloutLabels()
  }
})

// Watch for selected subdivisions changes to update boundaries
watch(() => dataStore.selectedSubdivisions, async () => {
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

.map-options-card.is-collapsed {
  padding: 6px 8px;
}

.map-options-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.map-options-title {
  font-size: 11px;
  font-weight: 600;
  color: #111827;
}

.map-options-toggle {
  border: none;
  background: transparent;
  font-size: 11px;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
}

.map-options-toggle:hover {
  text-decoration: underline;
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
  width: auto !important;
  height: auto !important;
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

.callout-field-title {
  font-size: 11px;
  font-weight: 600;
  color: #111827;
  margin-top: 2px;
}

.callout-field-divider {
  border-top: 1px solid #b3b7bf;
  margin: 4px 0;
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
  flex-wrap: nowrap;
  white-space: nowrap;
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