/**
 * In-memory cache for GeoJSON files to avoid repeated fetches
 */
const geoCache = {}

/**
 * Load GeoJSON data with caching
 */
export async function loadGeoJSON(url) {
  // Return cached data if available
  if (geoCache[url]) {
    return geoCache[url]
  }

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load GeoJSON: ${response.statusText}`)
    }
    const data = await response.json()
    geoCache[url] = data
    return data
  } catch (error) {
    console.error('Error loading GeoJSON:', error)
    throw error
  }
}

