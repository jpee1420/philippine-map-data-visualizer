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
const loading = ref(false)

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
      maxZoom: 12,
      maxBounds: [[4.5, 116.0], [21.0, 127.0]], // Philippines bounds
      maxBoundsViscosity: 1.0, // Prevent panning outside bounds
      preferCanvas: true // Better performance for many features
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
  let geoJsonPath = '/data/geoBoundaries-PHL-ADM0_simplified.geojson' // Default to country
  
  // If showing subdivisions, load the subdivision level
  if (dataStore.showSubdivisions && dataStore.subdivisionLevel) {
    switch (dataStore.subdivisionLevel) {
      case 'provinces':
        geoJsonPath = '/data/geoBoundaries-PHL-ADM2_simplified.geojson'
        break
      case 'cities':
        geoJsonPath = '/data/geoBoundaries-PHL-ADM3_simplified.geojson'
        break
    }
  } else {
    // Determine which GeoJSON to load based on map level
    switch (dataStore.mapLevel) {
      case 'country':
        geoJsonPath = '/data/geoBoundaries-PHL-ADM0_simplified.geojson'
        break
      case 'regions':
        geoJsonPath = '/data/geoBoundaries-PHL-ADM1_simplified.geojson'
        break
      case 'provinces':
        geoJsonPath = '/data/geoBoundaries-PHL-ADM2_simplified.geojson'
        break
      case 'cities':
        geoJsonPath = '/data/geoBoundaries-PHL-ADM3_simplified.geojson'
        break
    }
  }
  
  console.log('Loading GeoJSON from:', geoJsonPath)
  const geoData = await loadGeoJSON(geoJsonPath)
  console.log('GeoJSON loaded, features:', geoData?.features?.length)
  
  // Filter features if a specific location is focused or showing subdivisions
  let filteredGeoData = geoData
  
  if (dataStore.showSubdivisions && dataStore.parentLocation) {
    // Filter to show only subdivisions within parent location
    // This requires matching based on data - for now, show all at subdivision level
    // In production, you'd match based on parent region/province in the data
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
      const borderColor = dataStore.hideInternalBoundaries ? fillColor : '#ffffff'
      const borderOpacity = dataStore.hideInternalBoundaries ? 0.3 : 1
      
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
      
      // Click handler
      layer.on('click', () => {
        console.log('Clicked:', feature.properties)
      })
      
      // Hover effects
      layer.on('mouseover', () => {
        layer.setStyle({
          weight: 3,
          fillOpacity: 0.9
        })
      })
      
      layer.on('mouseout', () => {
        layer.setStyle({
          weight: 1.5,
          fillOpacity: 0.7
        })
      })
    }
  }).addTo(map.value)
  
  console.log('GeoJSON layer added to map')
  
  // Fit bounds
  if (geoData.features.length > 0) {
    const bounds = geoLayer.value.getBounds()
    console.log('Fitting bounds:', bounds)
    map.value.fitBounds(bounds)
  }
}

// Helper function to get location name from feature properties
function getLocationName(feature) {
  const props = feature.properties
  // Try common property names used in geoBoundaries
  return props.shapeName || props.shapeGroup || props.shapeID || 
         props.name || props.region || props.province || props.city || 
         'Unknown'
}

// Watch for data changes
watch(() => dataStore.filteredData, () => {
  if (dataStore.geoData) {
    renderGeoJSON(dataStore.geoData)
  }
})

watch(() => dataStore.selectedMetric, () => {
  if (dataStore.geoData) {
    renderGeoJSON(dataStore.geoData)
  }
})

// Watch for map level changes to reload appropriate GeoJSON
watch(() => dataStore.mapLevel, async () => {
  await loadGeoJSONData()
})

// Watch for map focus changes to filter features
watch(() => dataStore.mapFocus, async () => {
  await loadGeoJSONData()
})

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
