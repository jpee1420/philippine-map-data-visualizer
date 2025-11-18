/**
 * Load GeoJSON data
 */
const geoJsonCache = new Map()

export async function loadGeoJSON(url) {
  if (geoJsonCache.has(url)) {
    return geoJsonCache.get(url)
  }

  const promise = (async () => {
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
  })()

  geoJsonCache.set(url, promise)
  return promise
}
