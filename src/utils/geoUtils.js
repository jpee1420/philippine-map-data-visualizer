/**
 * Load GeoJSON data
 */
export async function loadGeoJSON(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load GeoJSON: ${response.statusText}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error loading GeoJSON:', error)
    throw error
  }
}

/**
 * Calculate bounds for GeoJSON (internal helper for getCenter)
 */
function calculateBounds(geoJSON) {
  if (!geoJSON || !geoJSON.features || geoJSON.features.length === 0) {
    return null
  }
  
  let minLat = Infinity, maxLat = -Infinity
  let minLng = Infinity, maxLng = -Infinity
  
  geoJSON.features.forEach(feature => {
    if (feature.geometry.type === 'Polygon') {
      feature.geometry.coordinates[0].forEach(coord => {
        const [lng, lat] = coord
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
      })
    } else if (feature.geometry.type === 'MultiPolygon') {
      feature.geometry.coordinates.forEach(polygon => {
        polygon[0].forEach(coord => {
          const [lng, lat] = coord
          minLat = Math.min(minLat, lat)
          maxLat = Math.max(maxLat, lat)
          minLng = Math.min(minLng, lng)
          maxLng = Math.max(maxLng, lng)
        })
      })
    }
  })
  
  return [[minLat, minLng], [maxLat, maxLng]]
}

/**
 * Get center point of GeoJSON
 */
export function getCenter(geoJSON) {
  const bounds = calculateBounds(geoJSON)
  if (!bounds) return [12.8797, 121.7740] // Default to Philippines center
  
  const [[minLat, minLng], [maxLat, maxLng]] = bounds
  return [(minLat + maxLat) / 2, (minLng + maxLng) / 2]
}
