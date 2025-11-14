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
