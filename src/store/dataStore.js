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

// Helper name normalization and variant expansion for robust matching
function _norm(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

function _stripParen(str) {
  return _norm(str).replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

function _extractParen(str) {
  const m = String(str || '').match(/\(([^)]+)\)/)
  return m ? _norm(m[1]) : ''
}

function _expandVariants(name) {
  const variants = new Set()
  const base = _norm(name)
  if (!base) return variants
  variants.add(base)
  const noParen = _stripParen(base)
  if (noParen && noParen !== base) variants.add(noParen)
  const inner = _extractParen(base)
  if (inner) variants.add(inner)
  return variants
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
    legendSelected: [], // Selected legend category values for filtering
    availableMetrics: [],
    mapLevel: 'country', // 'country', 'regions', or 'provinces'
    mapFocus: null, // Specific location to focus on (e.g., "Ilocos Region")
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
      this.applyLegendFilter()
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
    
    // Legend-based filtering
    applyLegendFilter() {
      if (this.legendField && Array.isArray(this.legendSelected) && this.legendSelected.length > 0) {
        const selectedSet = new Set(this.legendSelected.map(v => String(v)))
        this.filteredData = this.dataset.filter(row => selectedSet.has(String(row[this.legendField])))
      } else {
        // No legend filter -> use full dataset
        this.filteredData = this.dataset.slice()
      }
      this.updateColorScale()
    },
    
    setLegendSelections(values) {
      this.legendSelected = Array.isArray(values) ? values : []
      this.applyLegendFilter()
    },
    
    toggleLegendSelection(value) {
      const val = String(value)
      const set = new Set(this.legendSelected.map(v => String(v)))
      if (set.has(val)) set.delete(val); else set.add(val)
      this.legendSelected = Array.from(set)
      this.applyLegendFilter()
    },
    
    clearLegendSelections() {
      this.legendSelected = []
      this.applyLegendFilter()
    },
    
    updateColorScale() {
      const stats = this.metricStats
      this.colorScale.min = stats.min
      this.colorScale.max = stats.max
    },
    
    // Helper to find data row by location name with alias matching
    findRowByLocation(location) {
      const locVariants = _expandVariants(location)
      // Exact/variant match across region/province/city
      for (const r of this.filteredData) {
        const regionVars = _expandVariants(r.region)
        const provinceVars = _expandVariants(r.province)
        const cityVars = _expandVariants(r.city)
        for (const v of locVariants) {
          if (regionVars.has(v) || provinceVars.has(v) || cityVars.has(v)) {
            return r
          }
        }
      }

      // Alias-group matching including canonical name
      for (const r of this.filteredData) {
        const regionVars = _expandVariants(r.region)
        const provinceVars = _expandVariants(r.province)
        const cityVars = _expandVariants(r.city)
        for (const [canonical, aliases] of Object.entries(REGION_ALIASES)) {
          const aliasSet = new Set(aliases.map(a => _norm(a)))
          aliasSet.add(_norm(canonical))
          let locationInGroup = false
          for (const v of locVariants) {
            if (aliasSet.has(v)) { locationInGroup = true; break }
          }
          if (!locationInGroup) continue
          // Check if any field variant is also in the same group
          if ([...regionVars, ...provinceVars, ...cityVars].some(v => aliasSet.has(_norm(v)))) {
            return r
          }
        }
      }

      return null
    },
    
    getValueForLocation(location) {
      if (!this.selectedMetric) return null
      const row = this.findRowByLocation(location)
      if (row) return parseFloat(row[this.selectedMetric])
      // Region-level fallback: aggregate metric across rows belonging to the region
      if (this.mapLevel === 'regions') {
        const val = this._aggregateRegionMetric(location)
        return val !== null && !isNaN(val) ? val : null
      }
      return null
    },
    
    getColorForValue(value) {
      // No metric -> render polygon with white fill; borders are handled in MapView
      if (value === null || value === undefined) return '#ffffff'
      
      const { min, max, colors } = this.colorScale
      const normalized = (value - min) / (max - min || 1)
      const index = Math.floor(normalized * (colors.length - 1))
      
      return colors[Math.max(0, Math.min(colors.length - 1, index))]
    },
    
    // Sum all metric values for rows whose region matches the given region name (variant-aware)
    _aggregateRegionMetric(regionName) {
      if (!this.selectedMetric) return null
      const targets = _expandVariants(regionName)
      let sum = 0
      let matched = false
      for (const r of this.filteredData) {
        const rVars = _expandVariants(r.region)
        let inRegion = false
        for (const v of targets) { if (rVars.has(v)) { inRegion = true; break } }
        if (!inRegion) continue
        const val = parseFloat(r[this.selectedMetric])
        if (!isNaN(val)) { sum += val; matched = true }
      }
      return matched ? sum : null
    },
    
    setMapLevel(level) {
      this.mapLevel = level
      this.mapFocus = null // Clear focus when changing levels
    },
    
    setMapFocus(location) {
      this.mapFocus = location
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
