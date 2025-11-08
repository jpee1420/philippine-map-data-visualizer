<template>
  <div class="map-container">
    <div ref="mapElement" id="map" class="map"></div>
    <div v-if="loading" class="map-loading">
      <n-spin size="large" />
      <p>Loading map...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { NSpin } from 'naive-ui'
import L from 'leaflet'
import { useDataStore } from '@/store/dataStore'
import { loadGeoJSON, getCenter } from '@/utils/geoUtils'

const dataStore = useDataStore()
const mapElement = ref(null)
const map = ref(null)
const geoLayer = ref(null)
const calloutLayer = ref(null)
const loading = ref(false)
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
    
    console.log('Map initialized successfully')
    
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
  let geoJsonPath = `${basePath}data/geoBoundaries-PHL-ADM0_simplified.geojson` // Default to country
  
  // If showing subdivisions, load the subdivision level
  if (dataStore.showSubdivisions && dataStore.subdivisionLevel) {
    switch (dataStore.subdivisionLevel) {
      case 'provinces':
        geoJsonPath = `${basePath}data/geoBoundaries-PHL-ADM2_simplified.geojson`
        break
      case 'cities':
        geoJsonPath = `${basePath}data/geoBoundaries-PHL-ADM3_simplified.geojson`
        break
    }
  } else {
    // Determine which GeoJSON to load based on map level
    switch (dataStore.mapLevel) {
      case 'country':
        geoJsonPath = `${basePath}data/geoBoundaries-PHL-ADM0_simplified.geojson`
        break
      case 'regions':
        geoJsonPath = `${basePath}data/geoBoundaries-PHL-ADM1_simplified.geojson`
        break
      case 'provinces':
        geoJsonPath = `${basePath}data/geoBoundaries-PHL-ADM2_simplified.geojson`
        break
      case 'cities':
        geoJsonPath = `${basePath}data/geoBoundaries-PHL-ADM3_simplified.geojson`
        break
    }
  }
  
  console.log('Loading GeoJSON from:', geoJsonPath)
  const geoData = await loadGeoJSON(geoJsonPath)
  console.log('GeoJSON loaded, features:', geoData?.features?.length)
  
  // Filter features based on focus and selected subdivisions
  let filteredGeoData = geoData
  
  if (dataStore.mapFocus && dataStore.selectedSubdivisions.length > 0) {
    // Show parent region + selected subdivisions
    const parentFeatures = geoData.features.filter(feature => {
      const locationName = getLocationName(feature)
      return locationName === dataStore.mapFocus
    })
    
    // Load subdivision level GeoJSON
    let subdivisionPath = ''
    if (dataStore.mapLevel === 'regions') {
      subdivisionPath = `${basePath}data/geoBoundaries-PHL-ADM2_simplified.geojson`
    } else if (dataStore.mapLevel === 'provinces') {
      subdivisionPath = `${basePath}data/geoBoundaries-PHL-ADM3_simplified.geojson`
    }
    
    if (subdivisionPath) {
      const subdivisionData = await loadGeoJSON(subdivisionPath)
      const selectedSubFeatures = subdivisionData.features.filter(feature => {
        const locationName = getLocationName(feature)
        return dataStore.selectedSubdivisions.includes(locationName)
      })
      
      // Combine parent and selected subdivisions
      filteredGeoData = {
        ...geoData,
        features: [...parentFeatures, ...selectedSubFeatures]
      }
    } else {
      filteredGeoData = {
        ...geoData,
        features: parentFeatures
      }
    }
    console.log('Filtered features (parent + subdivisions):', filteredGeoData.features.length)
  } else if (dataStore.showSubdivisions && dataStore.parentLocation) {
    // Filter to show only subdivisions within parent location
    filteredGeoData = geoData
  } else if (dataStore.mapFocus && dataStore.mapLevel !== 'country') {
    filteredGeoData = {
      ...geoData,
      features: geoData.features.filter(feature => {
        const locationName = getLocationName(feature)
        return locationName === dataStore.mapFocus
      })
    }
    console.log('Filtered features:', filteredGeoData.features.length)
  }
  
  dataStore.setGeoData(filteredGeoData)
  renderGeoJSON(filteredGeoData)
}

// Render GeoJSON with colors
function renderGeoJSON(geoData) {
  console.log('Rendering GeoJSON, features:', geoData?.features?.length)
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
      const value = dataStore.getValueForLocation(locationName)
      const fillColor = dataStore.getColorForValue(value)
      
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
      const value = dataStore.getValueForLocation(locationName)
      
      // Tooltip
      const tooltipContent = `<strong>${locationName}</strong><br/>` +
        (value !== null && dataStore.selectedMetric ? 
          `${dataStore.selectedMetric}: ${value.toFixed(2)}` : 
          'No data available')
      
      layer.bindTooltip(tooltipContent, { 
        permanent: false, 
        direction: 'center',
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
  
  console.log('GeoJSON layer added to map')
  
  // Fit bounds when a region/province is selected and it's different from last zoomed
  const shouldZoom = dataStore.mapFocus && 
                     dataStore.selectedSubdivisions.length === 0 && 
                     geoData.features.length > 0 &&
                     lastFocusZoomed.value !== dataStore.mapFocus &&
                     !userHasMoved.value // Don't auto-zoom if user has manually moved
  
  console.log('Should zoom?', shouldZoom, {
    mapFocus: dataStore.mapFocus,
    subdivisions: dataStore.selectedSubdivisions.length,
    features: geoData.features.length,
    lastZoomed: lastFocusZoomed.value,
    userHasMoved: userHasMoved.value
  })
  
  if (shouldZoom) {
    const bounds = geoLayer.value.getBounds()
    console.log('Fitting bounds for selection:', dataStore.mapFocus)
    console.log('Bounds:', bounds)
    
    // Calculate appropriate zoom based on bounds size
    const boundsSize = bounds.getNorthEast().distanceTo(bounds.getSouthWest())
    const maxZoom = boundsSize < 100000 ? 11 : 10 // Higher zoom for smaller areas
    
    console.log('Bounds size:', boundsSize, 'Max zoom:', maxZoom)
    
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
      
      console.log('fitBounds executed for:', dataStore.mapFocus)
      lastFocusZoomed.value = dataStore.mapFocus
    }, 50)
  }
  
  // Render callout labels if enabled
  renderCalloutLabels()
}

// Render callout diagram labels
function renderCalloutLabels() {
  if (!map.value || !dataStore.geoData) return
  
  // Remove existing callout layer
  if (calloutLayer.value) {
    map.value.removeLayer(calloutLayer.value)
    calloutLayer.value = null
  }
  
  if (!dataStore.showCalloutLabels || !dataStore.selectedMetric) return
  
  // Create a layer group for callouts
  calloutLayer.value = L.layerGroup().addTo(map.value)
  
  // Get top locations to display
  const locationData = []
  dataStore.geoData.features.forEach(feature => {
    const locationName = getLocationName(feature)
    const value = dataStore.getValueForLocation(locationName)
    if (value !== null) {
      const center = getCenter(feature)
      locationData.push({ name: locationName, value, center, feature })
    }
  })
  
  // Sort by value and take top 10
  locationData.sort((a, b) => b.value - a.value)
  
  // If we have a map focus or region filter, show only that location
  // Otherwise show top 10
  let topLocations
  const focusedRegion = dataStore.mapFocus || dataStore.filters.region
  
  if (focusedRegion && locationData.length > 0) {
    // Find the focused location - try exact match first, then partial match
    let focusedLocation = locationData.find(loc => loc.name === focusedRegion)
    
    // If not found, try matching with region aliases
    if (!focusedLocation) {
      focusedLocation = locationData.find(loc => {
        // Check if names match when normalized
        const normalizeName = (name) => name.toLowerCase().trim()
        return normalizeName(loc.name) === normalizeName(focusedRegion) ||
               loc.name.includes(focusedRegion) ||
               focusedRegion.includes(loc.name)
      })
    }
    
    topLocations = focusedLocation ? [focusedLocation] : locationData.slice(0, 1)
    console.log('Focused location for callout:', focusedLocation?.name, 'from filter:', focusedRegion)
  } else {
    topLocations = locationData.slice(0, 10)
  }
  
  // Get current zoom level for scaling
  const zoom = map.value.getZoom()
  const baseZoom = 6 // Base zoom level for reference
  const zoomScale = Math.pow(1.5, zoom - baseZoom) // Scale factor based on zoom
  
  // Calculate label positions to avoid overlaps
  const positions = calculateLabelPositions(topLocations, zoom)
  
  // Create callout labels for each location
  topLocations.forEach((location, index) => {
    const { name, value, center } = location
    const labelPos = positions[index]
    
    // Scale marker size with zoom
    const markerRadius = Math.max(4, Math.min(10, 6 * zoomScale))
    
    // Create marker at actual location center
    const marker = L.circleMarker(center, {
      radius: markerRadius,
      fillColor: '#ff6b35',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    })
    
    // Create line from center to label
    const line = L.polyline([center, labelPos], {
      color: '#666',
      weight: Math.max(1, zoomScale * 0.8),
      opacity: 0.6,
      dashArray: '5, 5'
    })
    
    // Scale label content with zoom
    const fontSize = Math.max(10, Math.min(14, 12 * zoomScale))
    const labelWidth = Math.max(120, Math.min(180, 150 * zoomScale))
    
    // Create label with zoom-responsive sizing
    const labelIcon = L.divIcon({
      className: 'callout-label',
      html: `
        <div class="callout-content" style="font-size: ${fontSize}px; min-width: ${labelWidth}px;">
          <div class="callout-name">${name}</div>
          <div class="callout-value">${value.toFixed(0)}</div>
          <div class="callout-breakdown">
            <span class="male">Male ${Math.floor(value * 0.51)}</span>
            <span class="female">Female ${Math.floor(value * 0.49)}</span>
          </div>
        </div>
      `,
      iconSize: [labelWidth, 60 * zoomScale],
      iconAnchor: [0, 30 * zoomScale]
    })
    
    const label = L.marker(labelPos, { icon: labelIcon })
    
    // Add to layer group
    marker.addTo(calloutLayer.value)
    line.addTo(calloutLayer.value)
    label.addTo(calloutLayer.value)
  })
}

// Calculate label positions to avoid overlaps
function calculateLabelPositions(locations, zoom) {
  const positions = []
  const mapBounds = map.value.getBounds()
  
  // Use the center of the visible features as reference point
  // If there's a single focused location, use its bounds center
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
  const baseOffset = 1.5 / Math.pow(1.3, zoom - 6)
  
  locations.forEach((location, index) => {
    const center = location.center
    
    // Calculate offset direction based on position relative to reference center
    let offsetLat = 0
    let offsetLng = baseOffset
    
    // Position labels around the location based on its position
    if (center[0] > referenceCenter.lat) {
      offsetLat = baseOffset * 0.5 // North
    } else {
      offsetLat = -baseOffset * 0.5 // South
    }
    
    if (center[1] < referenceCenter.lng) {
      offsetLng = -baseOffset // West
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
function getLocationName(feature) {
  const props = feature.properties
  // Try common property names used in geoBoundaries
  return props.shapeName || props.shapeGroup || props.shapeID || 
         props.name || props.region || props.province || props.city || 
         'Unknown'
}

// Helper function to update layer colors
function updateLayerColors() {
  if (dataStore.geoData && geoLayer.value) {
    geoLayer.value.eachLayer((layer) => {
      if (layer.feature) {
        const locationName = getLocationName(layer.feature)
        const value = dataStore.getValueForLocation(locationName)
        const fillColor = dataStore.getColorForValue(value)
        layer.setStyle({ fillColor })
      }
    })
  }
}

// Watch for data changes - only re-render colors, don't reload GeoJSON
watch(() => dataStore.filteredData, updateLayerColors)
watch(() => dataStore.selectedMetric, updateLayerColors)

// Watch for map level changes to reload appropriate GeoJSON
watch(() => dataStore.mapLevel, async () => {
  console.log('Map level changed to:', dataStore.mapLevel)
  await loadGeoJSONData()
})

// Watch for map focus changes to filter features
watch(() => dataStore.mapFocus, async (newFocus, oldFocus) => {
  console.log('Map focus changed:', oldFocus, '->', newFocus)
  // Reset flags when focus changes to allow auto-zoom on new selection
  if (newFocus !== oldFocus) {
    lastFocusZoomed.value = null
    userHasMoved.value = false // Reset to allow auto-zoom on new selection
  }
  await loadGeoJSONData()
})

// Watch for selected subdivisions changes
watch(() => dataStore.selectedSubdivisions, async () => {
  console.log('Selected subdivisions changed:', dataStore.selectedSubdivisions)
  await loadGeoJSONData()
}, { deep: true })

// Watch for subdivision changes
watch(() => dataStore.showSubdivisions, async () => {
  await loadGeoJSONData()
})

// Watch for hide boundaries changes
watch(() => dataStore.hideInternalBoundaries, () => {
  if (dataStore.geoData) {
    renderGeoJSON(dataStore.geoData)
  }
})

// Watch for callout labels changes
watch(() => dataStore.showCalloutLabels, () => {
  if (dataStore.geoData) {
    renderCalloutLabels()
  }
})

// Watch for color scale changes to update map immediately
watch(() => dataStore.colorScale, () => {
  if (dataStore.geoData) {
    renderGeoJSON(dataStore.geoData)
  }
}, { deep: true })

// Watch for zoom changes to update callout sizes
watch(() => map.value, (newMap) => {
  if (newMap) {
    newMap.on('zoomend', () => {
      if (dataStore.showCalloutLabels) {
        // Add small delay to ensure zoom animation completes
        setTimeout(() => {
          renderCalloutLabels()
        }, 150)
      }
    })
  }
}, { immediate: true })

// Expose recenter method
const recenterMap = () => {
  if (map.value) {
    setTimeout(() => {
      map.value.invalidateSize()
      map.value.setView([12.8797, 121.7740], map.value.getZoom())
    }, 100)
  }
}

defineExpose({
  recenterMap
})
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 500px;
  background: #f8f9fa;
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
  background: white;
  border: 2px solid #333;
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  font-family: Arial, sans-serif;
  min-width: 140px;
}

.callout-name {
  font-weight: bold;
  font-size: 13px;
  color: #333;
  margin-bottom: 4px;
}

.callout-value {
  font-size: 18px;
  font-weight: bold;
  color: #2563eb;
  margin-bottom: 4px;
}

.callout-breakdown {
  font-size: 11px;
  color: #666;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.callout-breakdown .male {
  color: #3b82f6;
}

.callout-breakdown .female {
  color: #ec4899;
}
</style>