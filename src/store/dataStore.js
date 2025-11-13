import { defineStore } from 'pinia'

// Region name aliases for matching GeoJSON with CSV data
// Maps canonical region name to all possible variations
const REGION_ALIASES = {
  'National Capital Region': [
    'National Capital Region', 'NCR', 'Metro Manila', 'Manila', 
    'Region NCR', 'Region 13', 'Region XIII'
  ],
  'Cordillera Administrative Region': [
    'Cordillera Administrative Region', 'CAR', 'Cordillera', 
    'Region CAR', 'Cordilleras'
  ],
  'Ilocos Region': [
    'Ilocos Region', 'Ilocos', 'Region I', 'Region 1', 'R1', 
    'Region 01', 'REG1', 'REG I'
  ],
  'Cagayan Valley': [
    'Cagayan Valley', 'Region II', 'Region 2', 'R2', 
    'Region 02', 'REG2', 'REG II'
  ],
  'Central Luzon': [
    'Central Luzon', 'Region III', 'Region 3', 'R3', 
    'Region 03', 'REG3', 'REG III'
  ],
  'Calabarzon': [
    'CALABARZON', 'Calabarzon', 'Region IV-A', 'Region 4A', 'Region IVA',
    'Region 4-A', 'R4A', 'R4-A', 'REG4A', 'REG IV-A'
  ],
  'Mimaropa': [
    'MIMAROPA', 'Mimaropa', 'Region IV-B', 'Region 4B', 'Region IVB',
    'Region 4-B', 'R4B', 'R4-B', 'REG4B', 'REG IV-B', 'Southwestern Tagalog Region'
  ],
  'Bicol Region': [
    'Bicol Region', 'Bicol', 'Region V', 'Region 5', 'R5', 
    'Region 05', 'REG5', 'REG V', 'Bicolandia'
  ],
  'Western Visayas': [
    'Western Visayas', 'Region VI', 'Region 6', 'R6', 
    'Region 06', 'REG6', 'REG VI'
  ],
  'Central Visayas': [
    'Central Visayas', 'Region VII', 'Region 7', 'R7', 
    'Region 07', 'REG7', 'REG VII'
  ],
  'Eastern Visayas': [
    'Eastern Visayas', 'Region VIII', 'Region 8', 'R8', 
    'Region 08', 'REG8', 'REG VIII'
  ],
  'Zamboanga Peninsula': [
    'Zamboanga Peninsula', 'Zamboanga', 'Region IX', 'Region 9', 'R9', 
    'Region 09', 'REG9', 'REG IX'
  ],
  'Northern Mindanao': [
    'Northern Mindanao', 'Region X', 'Region 10', 'R10', 
    'REG10', 'REG X'
  ],
  'Davao Region': [
    'Davao Region', 'Davao', 'Region XI', 'Region 11', 'R11', 
    'REG11', 'REG XI'
  ],
  'Soccsksargen': [
    'SOCCSKSARGEN', 'Soccsksargen', 'SOCCKSARGEN', 'Region XII', 'Region 12', 'R12', 
    'REG12', 'REG XII', 'South Cotabato-Cotabato-Sultan Kudarat-Sarangani-General Santos'
  ],
  'Caraga': [
    'Caraga', 'CARAGA', 'Region XIII', 'Region 13', 'R13', 
    'REG13', 'REG XIII'
  ],
  'Bangsamoro Autonomous Region in Muslim Mindanao': [
    'BARMM', 'Bangsamoro', 'Bangsamoro Autonomous Region in Muslim Mindanao',
    'ARMM', 'Autonomous Region in Muslim Mindanao', 'Muslim Mindanao'
  ]
}

// Normalize dataset headers so region/province/city are recognized regardless of case or variants
function _normalizeKey(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '') // remove spaces, slashes, underscores, hyphens, etc.
}

const HEADER_ALIASES = {
  region: new Set(['region', 'regionname', 'reg']),
  province: new Set(['province', 'provincename', 'prov']),
  city: new Set([
    'city', 'cityname', 'municipality', 'municipal', 'municipalname',
    'cities', 'municipalities', 'citymunicipality', 'citiesmunicipalities',
    'citymunicipalityname', 'citiesandmunicipalities', 'cityandmunicipality',
    'citymunicipal', 'mun', 'municity'
  ])
}

function normalizeDatasetColumns(data) {
  if (!Array.isArray(data) || data.length === 0) return data
  const sample = data[0]
  const keys = Object.keys(sample)

  const keyMap = {}
  keys.forEach(k => {
    const nk = _normalizeKey(k)
    for (const [canon, set] of Object.entries(HEADER_ALIASES)) {
      if (set.has(nk) && !keyMap[canon]) {
        keyMap[canon] = k
      }
    }
  })

  // Return new dataset with canonical fields added if missing
  return data.map(row => {
    const newRow = { ...row }
    if (keyMap.region !== undefined && newRow.region === undefined) newRow.region = row[keyMap.region]
    if (keyMap.province !== undefined && newRow.province === undefined) newRow.province = row[keyMap.province]
    if (keyMap.city !== undefined && newRow.city === undefined) newRow.city = row[keyMap.city]
    return newRow
  })
}

export const useDataStore = defineStore('dataStore', {
  state: () => ({
    dataset: [],
    filteredData: [],
    geoData: null,
    selectedMetric: null,
    selectedMetrics: [], // Array of selected metrics for multi-metric display
    legendField: null, // Categorical field for legend (e.g., gender, nationality)
    legendCategories: [], // Unique categories from legend field
    filters: { 
      region: null, 
      province: null, 
      city: null 
    },
    availableMetrics: [],
    mapLevel: 'country', // 'country', 'regions', 'provinces', or 'cities'
    mapFocus: null, // Specific location to focus on (e.g., "Ilocos Region")
    showSubdivisions: false, // Show subdivisions within focused location
    subdivisionLevel: null, // 'provinces' or 'cities'
    parentLocation: null, // Parent location for subdivisions
    selectedSubdivisions: [], // Array of selected subdivisions to show boundaries
    hideInternalBoundaries: false, // Hide internal boundaries
    showCalloutLabels: false, // Show callout diagram labels on map
    colorScale: {
      min: 0,
      max: 100,
      colors: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'] // Default to blue
    }
  }),
  
  getters: {
    regions: (state) => {
      const uniqueRegions = [...new Set(state.dataset.map(row => row.region).filter(Boolean))]
      return uniqueRegions.sort()
    },
    
    provinces: (state) => {
      let data = state.dataset
      if (state.filters.region) {
        data = data.filter(row => row.region === state.filters.region)
      }
      const uniqueProvinces = [...new Set(data.map(row => row.province).filter(Boolean))]
      return uniqueProvinces.sort()
    },
    
    cities: (state) => {
      let data = state.dataset
      if (state.filters.region) {
        data = data.filter(row => row.region === state.filters.region)
      }
      if (state.filters.province) {
        data = data.filter(row => row.province === state.filters.province)
      }
      const uniqueCities = [...new Set(data.map(row => row.city).filter(Boolean))]
      return uniqueCities.sort()
    },
    
    metricStats: (state) => {
      if (!state.selectedMetric || state.filteredData.length === 0) {
        return { min: 0, max: 100, avg: 50, sum: 0 }
      }
      
      const values = state.filteredData
        .map(row => parseFloat(row[state.selectedMetric]))
        .filter(val => !isNaN(val))
      
      if (values.length === 0) {
        return { min: 0, max: 100, avg: 50, sum: 0 }
      }
      
      return {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        sum: values.reduce((a, b) => a + b, 0)
      }
    }
  },
  
  actions: {
    setDataset(data) {
      // Normalize headers so we always have region/province/city fields regardless of input casing
      this.dataset = normalizeDatasetColumns(data)
      this.detectMetrics()
      this.applyFilters()
    },
    
    setGeoData(geo) {
      this.geoData = geo
    },
    
    detectMetrics() {
      if (this.dataset.length === 0) return
      
      const firstRow = this.dataset[0]
      const excludeColumns = ['region', 'province', 'city', 'name', 'id']
      
      this.availableMetrics = Object.keys(firstRow).filter(key => {
        return !excludeColumns.includes(key.toLowerCase()) && 
               !isNaN(parseFloat(firstRow[key]))
      })
      
      if (this.availableMetrics.length > 0 && !this.selectedMetric) {
        this.selectedMetric = this.availableMetrics[0]
      }
    },
    
    setSelectedMetric(metric) {
      this.selectedMetric = metric
      this.updateColorScale()
    },
    
    setFilter(type, value) {
      this.filters[type] = value
      
      // Reset dependent filters
      if (type === 'region') {
        this.filters.province = null
        this.filters.city = null
      } else if (type === 'province') {
        this.filters.city = null
      }
      
      this.applyFilters()
    },
    
    clearFilters() {
      this.filters = {
        region: null,
        province: null,
        city: null
      }
      this.applyFilters()
    },
    
    applyFilters() {
      this.filteredData = this.dataset.filter(row => {
        return (!this.filters.region || row.region === this.filters.region) &&
               (!this.filters.province || row.province === this.filters.province) &&
               (!this.filters.city || row.city === this.filters.city)
      })
      
      this.updateColorScale()
    },
    
    updateColorScale() {
      const stats = this.metricStats
      this.colorScale.min = stats.min
      this.colorScale.max = stats.max
    },
    
    // Helper to find data row by location name with alias matching
    findRowByLocation(location) {
      // Try exact match first
      let row = this.filteredData.find(r => 
        r.region === location || 
        r.province === location || 
        r.city === location
      )
      
      // If no exact match, try case-insensitive and alias matching
      if (!row) {
        const locationLower = location.toLowerCase().trim()
        row = this.filteredData.find(r => {
          const regionLower = r.region?.toLowerCase().trim()
          const provinceLower = r.province?.toLowerCase().trim()
          const cityLower = r.city?.toLowerCase().trim()
          
          // Check if any field matches case-insensitively
          if (regionLower === locationLower ||
              provinceLower === locationLower ||
              cityLower === locationLower) {
            return true
          }
          
          // Check if location (from GeoJSON) matches any alias of data fields
          for (const [canonical, aliases] of Object.entries(REGION_ALIASES)) {
            const aliasesLower = aliases.map(a => a.toLowerCase().trim())
            
            // If the GeoJSON location matches any alias
            if (aliasesLower.includes(locationLower)) {
              // Check if the data row has any matching alias
              if (aliasesLower.includes(regionLower) ||
                  aliasesLower.includes(provinceLower) ||
                  aliasesLower.includes(cityLower)) {
                return true
              }
            }
            
            // If the data row matches any alias, check if location is also in that alias group
            if (aliasesLower.includes(regionLower) ||
                aliasesLower.includes(provinceLower) ||
                aliasesLower.includes(cityLower)) {
              if (aliasesLower.includes(locationLower)) {
                return true
              }
            }
          }
          return false
        })
      }
      
      return row
    },
    
    getValueForLocation(location) {
      if (!this.selectedMetric) return null
      const row = this.findRowByLocation(location)
      return row ? parseFloat(row[this.selectedMetric]) : null
    },
    
    getColorForValue(value) {
      if (value === null || value === undefined) return '#cccccc'
      
      const { min, max, colors } = this.colorScale
      const normalized = (value - min) / (max - min || 1)
      const index = Math.floor(normalized * (colors.length - 1))
      
      return colors[Math.max(0, Math.min(colors.length - 1, index))]
    },
    
    setMapLevel(level) {
      this.mapLevel = level
      this.mapFocus = null // Clear focus when changing levels
      this.showSubdivisions = false
      this.subdivisionLevel = null
      this.parentLocation = null
    },
    
    setMapFocus(location) {
      this.mapFocus = location
    },
    
    setShowSubdivisions(show) {
      this.showSubdivisions = show
    },
    
    setSubdivisionLevel(level) {
      this.subdivisionLevel = level
    },
    
    setParentLocation(location) {
      this.parentLocation = location
    },
    
    setSelectedSubdivisions(subdivisions) {
      this.selectedSubdivisions = subdivisions
    },
    
    setHideInternalBoundaries(hide) {
      this.hideInternalBoundaries = hide
    },
    
    setShowCalloutLabels(show) {
      this.showCalloutLabels = show
    }
  }
})
