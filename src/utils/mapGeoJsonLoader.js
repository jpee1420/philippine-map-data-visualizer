import union from '@turf/union'

import { loadGeoJSON } from '@/utils/geoUtils'
import { normalizeLocationName } from '@/utils/nameUtils'
import { BOUNDARY_PATHS, NCR_REGION_NAME } from '@/config/mapConfig'

function buildRegionOutlineFeature(features, regionName) {
  if (!features || features.length === 0) return null

  let merged = null

  for (const f of features) {
    if (!f || !f.geometry) continue
    const base = {
      type: 'Feature',
      properties: {},
      geometry: f.geometry
    }
    if (!merged) {
      merged = base
    } else {
      try {
        const u = union(merged, base)
        if (u && u.geometry) {
          merged = u
        }
      } catch (e) {
        console.warn('Union failed for region', regionName, e)
      }
    }
  }

  if (!merged || !merged.geometry) return null

  const firstProps = (features[0] && features[0].properties) || {}
  const regionProps = {
    ADM0_EN: firstProps.ADM0_EN || 'Philippines',
    ADM0_PCODE: firstProps.ADM0_PCODE || 'PH',
    ADM1_EN: regionName,
    ADM1_PCODE: firstProps.ADM1_PCODE || firstProps.ADM1_PCODE
  }

  return {
    type: 'Feature',
    properties: regionProps,
    geometry: merged.geometry
  }
}

function buildProvinceOutlineFeature(features, provinceName) {
  if (!features || features.length === 0) return null

  let merged = null

  for (const f of features) {
    if (!f || !f.geometry) continue
    const base = {
      type: 'Feature',
      properties: {},
      geometry: f.geometry
    }
    if (!merged) {
      merged = base
    } else {
      try {
        const u = union(merged, base)
        if (u && u.geometry) {
          merged = u
        }
      } catch (e) {
        console.warn('Union failed for province', provinceName, e)
      }
    }
  }

  if (!merged || !merged.geometry) return null

  const firstProps = (features[0] && features[0].properties) || {}
  const provProps = {
    ADM0_EN: firstProps.ADM0_EN || 'Philippines',
    ADM0_PCODE: firstProps.ADM0_PCODE || 'PH',
    ADM1_EN: firstProps.ADM1_EN,
    ADM1_PCODE: firstProps.ADM1_PCODE,
    ADM2_EN: provinceName,
    ADM2_PCODE: firstProps.ADM2_PCODE
  }

  return {
    type: 'Feature',
    properties: provProps,
    geometry: merged.geometry
  }
}

export async function loadMapGeoData({ mapLevel, mapFocus, selectedSubdivisions, basePath }) {
  const resolvedBasePath = basePath || '/'
  let geoJsonPath = `${resolvedBasePath}${BOUNDARY_PATHS.regions}`

  switch (mapLevel) {
    case 'regions':
      geoJsonPath = `${resolvedBasePath}${BOUNDARY_PATHS.regions}`
      break
    case 'provinces':
      geoJsonPath = `${resolvedBasePath}${BOUNDARY_PATHS.provinces}`
      break
  }

  const geoData = await loadGeoJSON(geoJsonPath)

  let filteredGeoData = geoData

  if (mapLevel === 'regions' && mapFocus) {
    const focusRegion = mapFocus
    const focusRegionName = normalizeLocationName(focusRegion)

    const isNCR = focusRegion.includes(NCR_REGION_NAME)

    if (isNCR) {
      const subdivisionPath = `${resolvedBasePath}${BOUNDARY_PATHS.cities}`
      const subdivisionData = await loadGeoJSON(subdivisionPath)

      const allRegionCities = (subdivisionData.features || []).filter(feature => {
        const props = feature.properties || {}
        const regionName = normalizeLocationName(props.ADM1_EN || '')
        return regionName === focusRegionName
      })

      const regionFeature = buildRegionOutlineFeature(allRegionCities, focusRegion)

      let features = []
      if (regionFeature) {
        features.push(regionFeature)
      }

      if (selectedSubdivisions && selectedSubdivisions.length > 0) {
        const selectedSet = new Set(selectedSubdivisions.map(code => String(code)))
        const selectedSubFeatures = allRegionCities.filter(feature => {
          const props = feature.properties || {}
          const code = String(props.ADM3_PCODE || '')
          return code && selectedSet.has(code)
        })
        features = regionFeature ? [regionFeature, ...selectedSubFeatures] : selectedSubFeatures
      }

      filteredGeoData = {
        ...subdivisionData,
        features
      }
    } else {
      const provincePath = `${resolvedBasePath}${BOUNDARY_PATHS.provinces}`
      const provinceData = await loadGeoJSON(provincePath)

      const allRegionProvinces = (provinceData.features || []).filter(feature => {
        const props = feature.properties || {}
        const regionName = normalizeLocationName(props.ADM1_EN || props.NAME_0)
        return regionName === focusRegionName
      })

      const regionFeature = buildRegionOutlineFeature(allRegionProvinces, focusRegion)

      let features = []
      if (regionFeature) {
        features.push(regionFeature)
      }

      if (selectedSubdivisions && selectedSubdivisions.length > 0) {
        const selectedSet = new Set(selectedSubdivisions.map(code => String(code)))
        const selectedProvinceFeatures = allRegionProvinces.filter(feature => {
          const props = feature.properties || {}
          const code = String(props.ADM2_PCODE || '')
          return code && selectedSet.has(code)
        })
        features = regionFeature ? [regionFeature, ...selectedProvinceFeatures] : selectedProvinceFeatures
      }

      filteredGeoData = {
        ...provinceData,
        features
      }
    }
  } else if (mapLevel === 'provinces' && mapFocus) {
    const focusProvince = mapFocus
    const focusProvinceName = normalizeLocationName(focusProvince)

    const subdivisionPath = `${resolvedBasePath}${BOUNDARY_PATHS.cities}`
    const subdivisionData = await loadGeoJSON(subdivisionPath)

    const allProvinceCities = (subdivisionData.features || []).filter(feature => {
      const props = feature.properties || {}
      const provName = normalizeLocationName(props.ADM2_EN || props.NAME_1)
      return provName === focusProvinceName
    })

    const provinceFeature = buildProvinceOutlineFeature(allProvinceCities, focusProvince)

    let features = []
    if (provinceFeature) {
      features.push(provinceFeature)
    }

    if (selectedSubdivisions && selectedSubdivisions.length > 0) {
      const selectedSet = new Set(selectedSubdivisions.map(code => String(code)))
      const selectedSubFeatures = allProvinceCities.filter(feature => {
        const props = feature.properties || {}
        const code = String(props.ADM3_PCODE || '')
        return code && selectedSet.has(code)
      })
      features = provinceFeature ? [provinceFeature, ...selectedSubFeatures] : selectedSubFeatures
    }

    filteredGeoData = {
      ...subdivisionData,
      features
    }
  }

  return filteredGeoData
}
