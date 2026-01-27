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
        <div v-if="!isOptionsCollapsed" class="map-options-row">
          <span class="map-options-label">Snapshot</span>
          <button
            type="button"
            class="map-options-snapshot"
            :disabled="isSnapshotting"
            @click="captureMapSnapshot"
          >
            {{ isSnapshotting ? 'Saving…' : 'Save PNG' }}
          </button>
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
import { useDataStore } from '@/store/dataStore'
import { getValueFromAggregates } from '@/utils/aggregateUtils'
import { calculateLabelPositions, getZoomResponsiveSize } from '@/utils/calloutLayoutUtils'
import { collectCalloutLocations, createCalloutElements } from '@/utils/mapCalloutUtils'
import { buildMapTooltipContent, getFillColorForLocation } from '@/utils/mapLayerUtils'
import { loadMapGeoData } from '@/utils/mapGeoJsonLoader'
import { saveElementAsTransparentPng } from '@/utils/mapSnapshotUtils'
import { normalizeLocationName } from '@/utils/nameUtils'
import { COLOR_MAPS, COLOR_SCHEME_OPTIONS } from '@/config/colorMaps'
import { useMapControls } from '@/composables/useMapControls'

import { debug } from '@/utils/logger'
import { buildCalloutHtml } from '@/components/map/CalloutDialog.vue'

const dataStore = useDataStore()
const mapElement = ref(null)

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
const isSnapshotting = ref(false)

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

onMounted(async () => {
  isLoading.value = true
  
  try {
    initializeMap(mapElement.value)
    debug('[MapView] Map initialized successfully')
    
    if (map.value) {
      map.value.on('zoomend', debouncedCollisionUpdate)
      map.value.on('moveend', debouncedCollisionUpdate)
      map.value.on('resize', debouncedCollisionUpdate)
    }
    
    await loadGeoJSONData()
  } catch (error) {
    console.error('Error initializing map:', error)
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  if (map.value) {
    map.value.off('zoomend', debouncedCollisionUpdate)
    map.value.off('moveend', debouncedCollisionUpdate)
    map.value.off('resize', debouncedCollisionUpdate)
  }
  if (collisionUpdateTimeout) {
    clearTimeout(collisionUpdateTimeout)
  }
  if (calloutLayer.value) {
    calloutLayer.value.clearLayers()
    if (map.value) {
      map.value.removeLayer(calloutLayer.value)
    }
    calloutLayer.value = null
  }
  if (geoLayer.value && map.value) {
    map.value.removeLayer(geoLayer.value)
    geoLayer.value = null
  }
  if (map.value) {
    map.value.off()
    map.value.remove()
    map.value = null
  }
})

async function loadGeoJSONData() {
  const basePath = import.meta.env.BASE_URL || '/'
  const filteredGeoData = await loadMapGeoData({
    mapLevel: dataStore.mapLevel,
    mapFocus: dataStore.mapFocus,
    selectedSubdivisions: dataStore.selectedSubdivisions,
    basePath
  })

  dataStore.setGeoData(filteredGeoData)
  renderGeoJSON(filteredGeoData)
}

function getStrictLevelFromProps(props) {
  if (!props) return null
  if (props.ADM3_EN) return 'city'
  if (props.ADM2_EN) return 'province'
  if (props.ADM1_EN) return 'region'
  return null
}

function shouldIncludeFeatureForCallouts(props, options) {
  const { hasRegionSubdivisions, selectedSubdivisionSet, isProvinceFocusView } = options

  if (hasRegionSubdivisions) {
    const adm3Code = props.ADM3_PCODE ? String(props.ADM3_PCODE) : ''
    const adm2Code = props.ADM2_PCODE ? String(props.ADM2_PCODE) : ''
    const code = adm3Code || adm2Code
    const isSelected =
      (adm3Code && selectedSubdivisionSet && selectedSubdivisionSet.has(adm3Code)) ||
      (adm2Code && selectedSubdivisionSet && selectedSubdivisionSet.has(adm2Code))
    if (!code || !isSelected) return false
  }

  if (isProvinceFocusView) {
    const hasProvinceName = !!props.ADM2_EN
    const hasCityOrMunicipality = !!props.ADM3_EN
    if (hasProvinceName && !hasCityOrMunicipality) return false
  }

  return true
}

function getAggregatesAndValueForLocation(locationName) {
  let aggregates = null
  if (typeof dataStore.getLocationAggregates === 'function') {
    aggregates = dataStore.getLocationAggregates(locationName)
  }

  let value = getValueFromAggregates(aggregates)
  if ((value === null || isNaN(value)) && dataStore.selectedMetric) {
    value = dataStore.getValueForLocation(locationName)
  }

  return { aggregates, value }
}

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

function getFeatureCenter(feature) {
  if (!feature || !feature.geometry) {
    return [12.8797, 121.7740]
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
    processCoordinates(feature.geometry.coordinates[0])
  } else if (feature.geometry.type === 'MultiPolygon') {
    feature.geometry.coordinates.forEach(polygon => {
      processCoordinates(polygon[0])
    })
  }

  if (pointCount === 0) {
    return [12.8797, 121.7740]
  }

  return [totalLat / pointCount, totalLng / pointCount]
}

// Render GeoJSON with colors
function renderGeoJSON(geoData) {
  if (!map.value || !geoData) {
    console.warn('Cannot render: map or geoData is null')
    return
  }
  
  if (geoLayer.value) {
    geoLayer.value.eachLayer(layer => {
      if (layer.unbindTooltip) layer.unbindTooltip()
    })
    map.value.removeLayer(geoLayer.value)
  }
  
  geoLayer.value = L.geoJSON(geoData, {
    style: (feature) => {
      const locationName = getLocationName(feature)
      const props = feature.properties || {}
      const strictLevel = getStrictLevelFromProps(props)

      const fillColor = getFillColorForLocation(dataStore, locationName, {
        strictLevel,
        preferCount: true,
        allowRegionFallback: true
      })
      
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
      const tooltipContent = buildMapTooltipContent(dataStore, locationName)
      
      layer.bindTooltip(tooltipContent, { 
        permanent: false, 
        direction: 'top',
        sticky: true,
        className: 'custom-tooltip'
      })
      
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
  
  const shouldZoom = dataStore.mapFocus && 
                     geoData.features.length > 0 &&
                     lastFocusZoomed.value !== dataStore.mapFocus &&
                     !hasUserMoved.value // Don't auto-zoom if user has manually moved
  
  if (shouldZoom) {
    const bounds = geoLayer.value.getBounds()
    
    const boundsSize = bounds.getNorthEast().distanceTo(bounds.getSouthWest())
    const maxZoom = boundsSize < 100000 ? 11 : 10 // Higher zoom for smaller areas
    
    setTimeout(() => {
      fitBoundsProgrammatic(bounds, { maxZoom })
      lastFocusZoomed.value = dataStore.mapFocus
    }, 50)
  }
}

function updateCollisionLayout() {
  if (!dataStore.showCalloutLabels || !calloutLayer.value) return
  renderCalloutLabels()
}

let collisionUpdateTimeout = null
function debouncedCollisionUpdate() {
  if (collisionUpdateTimeout) {
    clearTimeout(collisionUpdateTimeout)
  }
  collisionUpdateTimeout = setTimeout(() => {
    updateCollisionLayout()
  }, 100)
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

  const hasRegionSubdivisions = dataStore.mapLevel === 'regions' &&
    Array.isArray(dataStore.selectedSubdivisions) &&
    dataStore.selectedSubdivisions.length > 0
  const isProvinceFocusView = dataStore.mapLevel === 'provinces' && Boolean(dataStore.mapFocus)

  const selectedSubdivisionSet = hasRegionSubdivisions
    ? new Set(dataStore.selectedSubdivisions.map(code => String(code)))
    : null

  const { topLocations, grandTotal } = collectCalloutLocations({
    geoFeatures: dataStore.geoData.features,
    getLocationName,
    getFeatureCenter,
    getAggregatesAndValueForLocation,
    shouldIncludeFeatureForCallouts,
    hasRegionSubdivisions,
    selectedSubdivisionSet,
    isProvinceFocusView
  })

  if (!topLocations.length) return
  
  const zoom = map.value.getZoom()
  
  const positions = calculateLabelPositions(map.value, topLocations, zoom)
  
  // Create callout labels for each location
  topLocations.forEach((location, index) => {
    const key = getCalloutKey(location.name)
    let labelPos = positions[index]
    const savedPos =
      calloutPositions.value && calloutPositions.value[key]
        ? calloutPositions.value[key]
        : null
    if (savedPos && typeof savedPos.lat === 'number' && typeof savedPos.lng === 'number') {
      labelPos = [savedPos.lat, savedPos.lng]
    }

    createCalloutElements({
      L,
      mapInstance: map.value,
      mapElement: mapElement.value,
      layerGroup: calloutLayer.value,
      location: { ...location, grandTotal },
      index,
      zoom,
      labelPos,
      getCalloutKey,
      getZoomResponsiveSize,
      buildCalloutHtml,
      calloutBackgroundEnabled: dataStore.calloutBackgroundEnabled,
      calloutPositions: calloutPositions.value,
      constrainLatLngToMap,
      updateConnectorLine
    })
  })
}

function getCalloutKey(name) {
  const level = dataStore.mapLevel || 'any'
  const focus = dataStore.mapFocus || 'all'
  return `${level}|${focus}|${name}`
}

function constrainLatLngToMap(latLng) {
  if (!map.value || !latLng) return latLng

  const mapInstance = map.value
  const mapSize = mapInstance.getSize()
  const padding = 20
  const point = mapInstance.latLngToContainerPoint(latLng)
  const clampedX = Math.max(padding, Math.min(mapSize.x - padding, point.x))
  const clampedY = Math.max(padding, Math.min(mapSize.y - padding, point.y))
  return mapInstance.containerPointToLatLng([clampedX, clampedY])
}

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

function updateLayerColors() {
  if (dataStore.geoData && geoLayer.value) {
    geoLayer.value.eachLayer((layer) => {
      if (layer.feature) {
        const locationName = getLocationName(layer.feature)
        const fillColor = getFillColorForLocation(dataStore, locationName, { preferCount: true })
        
        layer.setStyle({ fillColor })
      }
    })
  }
}

function buildTooltipContent(locationName) {
  return buildMapTooltipContent(dataStore, locationName)
}

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

async function captureMapSnapshot() {
  if (!mapElement.value || isSnapshotting.value) return

  const element = mapElement.value

  try {
    isSnapshotting.value = true
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const focusLabel = (dataStore.mapFocus || dataStore.mapLevel || 'map')
      .toString()
      .replace(/\s+/g, '-')
      .toLowerCase()

    await saveElementAsTransparentPng(element, {
      fileName: `map-snapshot-${focusLabel}-${timestamp}.png`,
      controlSelectors: '.leaflet-control-container, .leaflet-control-zoom, .leaflet-control-attribution',
      scale: window.devicePixelRatio || 2
    })
  } catch (error) {
    console.error('Error capturing map snapshot:', error)
  } finally {
    isSnapshotting.value = false
  }
}

watch(() => dataStore.filteredData, refreshLayerVisuals)
watch(() => dataStore.valueFields, refreshLayerVisuals, { deep: true })
watch(() => dataStore.selectedMetrics, refreshLayerVisuals, { deep: true })
watch(() => dataStore.selectedMetric, refreshLayerVisuals)

watch(() => dataStore.mapLevel, async () => {
  calloutPositions.value = {}
  await loadGeoJSONData()
  if (dataStore.showCalloutLabels && dataStore.geoData) {
    renderCalloutLabels()
  }
})

watch(() => dataStore.mapFocus, async (newFocus, oldFocus) => {
  if (newFocus !== oldFocus) {
    lastFocusZoomed.value = null
    hasUserMoved.value = false
  }
  calloutPositions.value = {}
  await loadGeoJSONData()
  if (dataStore.showCalloutLabels && dataStore.geoData) {
    renderCalloutLabels()
  }
})

watch(() => dataStore.selectedSubdivisions, async () => {
  calloutPositions.value = {}
  await loadGeoJSONData()
  if (dataStore.showCalloutLabels && dataStore.geoData) {
    renderCalloutLabels()
  }
}, { deep: true })

// watch for callout labels changes
watch(() => dataStore.showCalloutLabels, () => {
  if (dataStore.geoData) {
    renderCalloutLabels()
  }
})

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

watch(() => dataStore.colorScale, () => {
  if (dataStore.geoData) {
    refreshLayerColorsAndTooltips()
  }
}, { deep: true })

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

.map-options-snapshot {
  border: 1px solid #d1d5db;
  background: #f9fafb;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  color: #111827;
  cursor: pointer;
}

.map-options-snapshot:disabled {
  opacity: 0.6;
  cursor: default;
}

.map-options-snapshot:not(:disabled):hover {
  background: #e5e7eb;
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