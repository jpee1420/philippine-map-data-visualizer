import { ref } from 'vue'
import L from 'leaflet'

/**
 * Composable for Leaflet map initialization and interaction tracking
 */
export function useMapControls(options = {}) {
  const {
    center = [12.8797, 121.7740],
    zoom = 6,
    minZoom = 5,
    maxZoom = 13
  } = options

  const map = ref(null)
  const isLoading = ref(false)
  const lastFocusZoomed = ref(null)
  const hasUserMoved = ref(false)

  const initializeMap = (element) => {
    if (!element) return null

    map.value = L.map(element, {
      center, zoom, zoomControl: true, minZoom, maxZoom,
      zoomSnap: 0.5, zoomDelta: 0.5,
      maxBoundsViscosity: 0.0, preferCanvas: true
    })

    map.value.on('movestart', () => {
      if (!map.value._programmaticMove) hasUserMoved.value = true
    })

    return map.value
  }

  const fitBoundsProgrammatic = (bounds, opts = {}) => {
    if (!map.value || !bounds) return
    map.value._programmaticMove = true
    map.value.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 0.5, ...opts })
    setTimeout(() => { map.value._programmaticMove = false }, 600)
  }

  const resetMoveTracking = () => {
    hasUserMoved.value = false
    lastFocusZoomed.value = null
  }

  return {
    map, isLoading, lastFocusZoomed, hasUserMoved,
    initializeMap, fitBoundsProgrammatic, resetMoveTracking
  }
}
