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
 * Filter GeoJSON features based on criteria
 */
export function filterGeoJSON(geoJSON, filterFn) {
  if (!geoJSON || !geoJSON.features) return geoJSON
  
  return {
    ...geoJSON,
    features: geoJSON.features.filter(filterFn)
  }
}

/**
 * Get feature by property
 */
export function findFeature(geoJSON, property, value) {
  if (!geoJSON || !geoJSON.features) return null
  
  return geoJSON.features.find(feature => 
    feature.properties && feature.properties[property] === value
  )
}

/**
 * Merge data with GeoJSON properties
 */
export function mergeDataWithGeoJSON(geoJSON, data, geoKey, dataKey) {
  if (!geoJSON || !geoJSON.features) return geoJSON
  
  const dataMap = new Map(data.map(item => [item[dataKey], item]))
  
  return {
    ...geoJSON,
    features: geoJSON.features.map(feature => {
      const key = feature.properties[geoKey]
      const matchedData = dataMap.get(key)
      
      return {
        ...feature,
        properties: {
          ...feature.properties,
          ...matchedData
        }
      }
    })
  }
}

/**
 * Calculate bounds for GeoJSON
 */
export function calculateBounds(geoJSON) {
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

/**
 * Simplify GeoJSON for better performance
 */
export function simplifyGeoJSON(geoJSON, tolerance = 0.01) {
  // This is a placeholder - in production, use a library like turf.js
  return geoJSON
}

/**
 * Create a simple Philippine regions GeoJSON for demo
 */
export function createDemoGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'NCR', region: 'National Capital Region' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [120.9, 14.7],
            [121.1, 14.7],
            [121.1, 14.5],
            [120.9, 14.5],
            [120.9, 14.7]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Region I', region: 'Ilocos Region' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [120.0, 18.0],
            [121.0, 18.0],
            [121.0, 16.5],
            [120.0, 16.5],
            [120.0, 18.0]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Region III', region: 'Central Luzon' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [120.0, 16.0],
            [121.5, 16.0],
            [121.5, 14.5],
            [120.0, 14.5],
            [120.0, 16.0]
          ]]
        }
      }
    ]
  }
}
