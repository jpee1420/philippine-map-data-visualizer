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
    // Show parent region/province + selected subdivisions
    console.log('Loading subdivisions for:', dataStore.mapFocus)
    console.log('Selected subdivisions:', dataStore.selectedSubdivisions)
    console.log('Current map level:', dataStore.mapLevel)
    
    const parentFeatures = geoData.features.filter(feature => {
      const locationName = getLocationName(feature)
      return locationName === dataStore.mapFocus
    })
    
    console.log('Parent features found:', parentFeatures.length)
    
    // Load subdivision level GeoJSON
    let subdivisionPath = ''
    if (dataStore.mapLevel === 'regions') {
      subdivisionPath = `${basePath}data/geoBoundaries-PHL-ADM2_simplified.geojson`
      console.log('Loading provinces (ADM2) for region')
    } else if (dataStore.mapLevel === 'provinces') {
      subdivisionPath = `${basePath}data/geoBoundaries-PHL-ADM3_simplified.geojson`
      console.log('Loading cities (ADM3) for province')
    }
    
    if (subdivisionPath) {
      const subdivisionData = await loadGeoJSON(subdivisionPath)
      console.log('Subdivision data loaded, total features:', subdivisionData.features.length)
      
      const selectedSubFeatures = subdivisionData.features.filter(feature => {
        const locationName = getLocationName(feature)
        
        // Check exact match first
        let isSelected = dataStore.selectedSubdivisions.includes(locationName)
        
        // If not found, try normalized matching (remove "City" suffix)
        if (!isSelected) {
          const normalizedLocation = locationName.replace(/\s+City$/i, '').trim()
          isSelected = dataStore.selectedSubdivisions.some(selected => {
            const normalizedSelected = selected.replace(/\s+City$/i, '').trim()
            return normalizedLocation.toLowerCase() === normalizedSelected.toLowerCase()
          })
        }
        
        if (isSelected) {
          console.log('Found selected subdivision:', locationName)
        }
        return isSelected
      })
      
      console.log('Selected subdivision features found:', selectedSubFeatures.length)
      
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
    console.log('Total filtered features (parent + subdivisions):', filteredGeoData.features.length)
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
      let fillColor
      
      // If legend field is set, color by category
      if (dataStore.legendField && dataStore.legendCategories.length > 0) {
        const row = dataStore.findRowByLocation(locationName)
        const categoryValue = row ? row[dataStore.legendField] : null
        const categoryIndex = dataStore.legendCategories.indexOf(categoryValue)
        fillColor = getCategoryColor(categoryIndex >= 0 ? categoryIndex : 0)
      } else {
        // Otherwise, color by metric value
        const value = dataStore.getValueForLocation(locationName)
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
      
      // Build tooltip with multiple metrics if available
      let tooltipContent = `<strong>${locationName}</strong><br/>`
      
      if (dataStore.selectedMetrics && dataStore.selectedMetrics.length > 0) {
        // Show all selected metrics using alias-aware matching
        const row = dataStore.findRowByLocation(locationName)
        
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
      } else {
        tooltipContent += 'No data available'
      }
      
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
      // Calculate center from feature's geometry bounds
      const center = getFeatureCenter(feature)
      locationData.push({ name: locationName, value, center, feature })
    }
  })
  
  // Sort by value and take top locations
  locationData.sort((a, b) => b.value - a.value)
  
  // Show callouts for all currently visible features
  // If there are selected subdivisions (e.g., provinces within a region), show those
  // Otherwise, show top 10 by value
  let topLocations
  
  if (dataStore.selectedSubdivisions.length > 0) {
    // Show callouts for selected subdivisions (e.g., checked provinces)
    topLocations = locationData.filter(loc => 
      dataStore.selectedSubdivisions.includes(loc.name)
    )
    console.log('Showing callouts for selected subdivisions:', topLocations.length)
  } else if (locationData.length <= 20) {
    // If viewing a focused region with few features (e.g., provinces in a region), show all
    topLocations = locationData
    console.log('Showing callouts for all visible features:', topLocations.length)
  } else {
    // Otherwise show top 10 by value
    topLocations = locationData.slice(0, 10)
    console.log('Showing top 10 callouts by value')
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
    const labelWidth = Math.max(120, Math.min(200, 160 * zoomScale))
    
    // Get row data for additional metrics
    const row = dataStore.findRowByLocation(name)
    
    // Build metrics display
    let metricsHtml = ''
    if (dataStore.selectedMetrics && dataStore.selectedMetrics.length > 0) {
      metricsHtml = dataStore.selectedMetrics.map(metric => {
        const metricValue = row ? parseFloat(row[metric]) : null
        const formattedValue = metricValue !== null && !isNaN(metricValue)
          ? metricValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
          : 'N/A'
        return `<div class="callout-metric"><span class="metric-name">${metric}:</span> <span class="metric-value">${formattedValue}</span></div>`
      }).join('')
    } else {
      // Fallback to single metric
      const formattedValue = value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      metricsHtml = `<div class="callout-value">${dataStore.selectedMetric}: ${formattedValue}</div>`
    }
    
    // Create unique ID for this callout
    const calloutId = `callout-${index}-${name.replace(/\s+/g, '-')}`
    
    // Create label with zoom-responsive sizing and interactive controls
    const labelIcon = L.divIcon({
      className: 'callout-label',
      html: `
        <div class="callout-content draggable-callout" 
             data-callout-id="${calloutId}"
             style="font-size: ${fontSize}px; min-width: ${labelWidth}px;">
          <div class="callout-header">
            <div class="callout-name">${name}</div>
            <div class="callout-controls">
              <button class="callout-btn resize-btn" title="Resize">⊡</button>
            </div>
          </div>
          <div class="callout-metrics">
            ${metricsHtml}
          </div>
          <div class="resize-handle" title="Drag to resize"></div>
        </div>
      `,
      iconSize: [labelWidth, 'auto'],
      iconAnchor: [0, 0]
    })
    
    const label = L.marker(labelPos, { 
      icon: labelIcon,
      draggable: true,
      autoPan: false
    })
    
    // Store reference to update line when dragged
    label._boundaryCenter = center
    label._connectorLine = line
    
    // Update line when label is dragged
    label.on('drag', (e) => {
      const newPos = e.target.getLatLng()
      line.setLatLngs([center, [newPos.lat, newPos.lng]])
    })
    
    // Add to layer group
    marker.addTo(calloutLayer.value)
    line.addTo(calloutLayer.value)
    label.addTo(calloutLayer.value)
    
    // Add resize functionality after DOM is ready
    setTimeout(() => {
      setupCalloutInteractions(calloutId, label, line, center)
    }, 100)
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

// Setup interactive controls for callout (resize)
function setupCalloutInteractions(calloutId, marker, line, center) {
  const element = document.querySelector(`[data-callout-id="${calloutId}"]`)
  if (!element) return
  
  const resizeHandle = element.querySelector('.resize-handle')
  if (!resizeHandle) return
  
  let isResizing = false
  let startX, startY, startWidth, startHeight
  
  resizeHandle.addEventListener('mousedown', (e) => {
    e.stopPropagation()
    isResizing = true
    startX = e.clientX
    startY = e.clientY
    startWidth = element.offsetWidth
    startHeight = element.offsetHeight
    
    element.style.transition = 'none'
    document.body.style.cursor = 'nwse-resize'
    
    const onMouseMove = (e) => {
      if (!isResizing) return
      
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY
      
      // Calculate new dimensions (minimum 100px)
      const newWidth = Math.max(100, startWidth + deltaX)
      const newHeight = Math.max(60, startHeight + deltaY)
      
      element.style.width = `${newWidth}px`
      element.style.minWidth = `${newWidth}px`
      element.style.height = `${newHeight}px`
    }
    
    const onMouseUp = () => {
      isResizing = false
      element.style.transition = ''
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  })
}

// Helper function to get location name from feature properties
function getLocationName(feature) {
  const props = feature.properties
  // Try common property names used in geoBoundaries
  return props.shapeName || props.shapeGroup || props.shapeID || 
         props.name || props.region || props.province || props.city || 
         'Unknown'
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
          const row = dataStore.findRowByLocation(locationName)
          const categoryValue = row ? row[dataStore.legendField] : null
          const categoryIndex = dataStore.legendCategories.indexOf(categoryValue)
          fillColor = getCategoryColor(categoryIndex >= 0 ? categoryIndex : 0)
        } else {
          // Otherwise, color by metric value
          const value = dataStore.getValueForLocation(locationName)
          fillColor = dataStore.getColorForValue(value)
        }
        
        layer.setStyle({ fillColor })
      }
    })
  }
}

// Watch for data changes - only re-render colors, don't reload GeoJSON
watch(() => dataStore.filteredData, updateLayerColors)
watch(() => dataStore.selectedMetric, updateLayerColors)
watch(() => dataStore.legendField, updateLayerColors)
watch(() => dataStore.legendCategories, updateLayerColors, { deep: true })

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

// Expose invalidate size method (for container resize without recentering)
const invalidateMapSize = () => {
  if (map.value) {
    // Mark as programmatic to prevent userHasMoved flag
    map.value._programmaticMove = true
    
    setTimeout(() => {
      map.value.invalidateSize()
      
      // Reset flag after invalidation
      setTimeout(() => {
        map.value._programmaticMove = false
      }, 100)
    }, 100)
  }
}

defineExpose({
  recenterMap,
  invalidateMapSize
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
  position: relative;
  cursor: move;
  transition: box-shadow 0.2s;
}

.callout-content:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.callout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.callout-name {
  font-weight: bold;
  font-size: 13px;
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
  margin-top: 4px;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 0%, transparent 50%, #9ca3af 50%, #9ca3af 100%);
  border-bottom-right-radius: 6px;
}

.resize-handle:hover {
  background: linear-gradient(135deg, transparent 0%, transparent 50%, #6b7280 50%, #6b7280 100%);
}

.callout-value {
  font-size: 16px;
  font-weight: bold;
  color: #2563eb;
  margin-bottom: 4px;
}

.callout-metric {
  font-size: 11px;
  color: #444;
  margin: 2px 0;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.callout-metric .metric-name {
  color: #666;
  font-weight: 500;
}

.callout-metric .metric-value {
  color: #2563eb;
  font-weight: 600;
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