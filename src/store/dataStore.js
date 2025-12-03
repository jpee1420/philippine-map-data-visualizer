import { defineStore } from 'pinia'
import { normalizeLocationName } from '@/utils/nameUtils'
import { COLOR_MAPS } from '@/config/colorMaps'

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
    'city',
    'cityname',
    'municipality',
    'municipal',
    'municipalname',
    'municipalitycity', // e.g. "MUNICIPALITY/CITY" from Google Sheets
    'cities',
    'municipalities',
    'citymunicipality',
    'citiesmunicipalities',
    'citymunicipalityname',
    'citiesandmunicipalities',
    'cityandmunicipality',
    'citymunicipal',
    'mun',
    'municity'
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
    if (keyMap.region !== undefined && newRow.region === undefined) {
      newRow.region = row[keyMap.region]
    }
    if (keyMap.province !== undefined && newRow.province === undefined) {
      newRow.province = row[keyMap.province]
    }
    if (keyMap.city !== undefined && newRow.city === undefined) {
      newRow.city = row[keyMap.city]
    }
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

  // City naming variants: handle forms like
  // "City of San Fernando (Capital)" <-> "San Fernando City" <-> "San Fernando"
  const formsToCheck = new Set([base, noParen])
  formsToCheck.forEach((form) => {
    if (!form) return

    // "City of X" -> "X", "X City"
    if (form.startsWith('city of ')) {
      const stem = form.slice('city of '.length).trim()
      if (stem) {
        variants.add(stem)
        variants.add(`${stem} city`)
      }
    }

    // "X City" -> "X", "City of X"
    if (form.endsWith(' city')) {
      const stem = form.replace(/\s+city$/, '').trim()
      if (stem) {
        variants.add(stem)
        variants.add(`city of ${stem}`)
      }
    }
  })
  return variants
}

// Determine if a dataset region value matches a focused region name,
// using direct variant comparison plus REGION_ALIASES groups.
function _isRegionMatch(rowRegion, focusRegion) {
  if (!rowRegion || !focusRegion) return false
  const rowVars = _expandVariants(rowRegion)
  const focusVars = _expandVariants(focusRegion)

  // Direct variant intersection
  for (const v of rowVars) {
    if (focusVars.has(v)) return true
  }

  // Alias-group matching (e.g., "Region I" vs "Ilocos Region")
  for (const [canonical, aliases] of Object.entries(REGION_ALIASES)) {
    const aliasSet = new Set(aliases.map(a => _norm(a)))
    aliasSet.add(_norm(canonical))

    let rowInGroup = false
    let focusInGroup = false

    for (const v of rowVars) {
      if (aliasSet.has(v)) { rowInGroup = true; break }
    }
    if (!rowInGroup) continue

    for (const v of focusVars) {
      if (aliasSet.has(v)) { focusInGroup = true; break }
    }
    if (focusInGroup) return true
  }

  return false
}

export const useDataStore = defineStore('dataStore', {
  state: () => ({
    dataset: [],
    filteredData: [],
    locationRowIndex: {},
    geoData: null,
    selectedMetric: null,
    selectedMetrics: [], // Array of selected metrics for multi-metric display
    filterDimensions: [],
    filterSelections: {},
    availableMetrics: [],
    valueFields: [], // [{ field, agg }] for metrics and counts
    mapLevel: 'regions', // 'regions' or 'provinces'
    mapFocus: null, // Specific location to focus on (e.g., "Ilocos Region")
    selectedSubdivisions: [], // Array of selected subdivisions to show boundaries
    hideInternalBoundaries: false, // Hide internal boundaries
    showCalloutLabels: false, // Show callout diagram labels on map
    calloutBackgroundEnabled: false, // Show background card and border for callout labels
    colorScale: {
      min: 0,
      max: 100,
      breaks: null, // Quantile breaks for better color distribution
      colors: COLOR_MAPS.blue,
      usableColors: COLOR_MAPS.blue.filter(c => c.toLowerCase() !== '#ffffff') // Pre-computed for performance
    },
    locationRowsCache: {},
    locationAggregatesCache: {}
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

      // Reset data-dependent state so nothing is carried over from previous imports
      this.filteredData = []
      this.locationRowIndex = {}
      this.availableMetrics = []
      this.selectedMetric = null
      this.selectedMetrics = []
      this.filterDimensions = []
      this.filterSelections = {}
      this.valueFields = []
      this.locationRowsCache = {}
      this.locationAggregatesCache = {}

      this.detectMetrics()
      this.applyLegendFilter()
    },
    
    clearDataset() {
      this.dataset = []
      this.filteredData = []
      this.locationRowIndex = {}
      this.availableMetrics = []
      this.selectedMetric = null
      this.selectedMetrics = []
      this.filterDimensions = []
      this.filterSelections = {}
      this.valueFields = []
      this.locationRowsCache = {}
      this.locationAggregatesCache = {}
      this.updateColorScale()
    },
    
    setGeoData(geo) {
      this.geoData = geo
      // Recalculate color scale based on new geo features
      this.updateColorScale()
    },
    
    detectMetrics() {
      if (this.dataset.length === 0) return
      
      const firstRow = this.dataset[0]
      const excludeColumns = ['region', 'province', 'city', 'name', 'id']
      
      this.availableMetrics = Object.keys(firstRow).filter(key => {
        return !excludeColumns.includes(key.toLowerCase()) && 
               !isNaN(parseFloat(firstRow[key]))
      })
    },
    
    setSelectedMetric(metric) {
      this.selectedMetric = metric
      this.updateColorScale()
    },
    
    // Legend-based and dimension-based filtering
    applyLegendFilter() {
      let rows = this.dataset.slice()

      // Map-level filtering from MapSelector: restrict rows to selected
      // region or province when present. If no rows match, fall back to
      // the full dataset so the table doesn't appear empty.
      if (this.mapFocus) {
        if (this.mapLevel === 'regions') {
          const regionFiltered = rows.filter(row => _isRegionMatch(row.region, this.mapFocus))
          if (regionFiltered.length > 0) {
            rows = regionFiltered
          }
        } else if (this.mapLevel === 'provinces') {
          const targetProvince = _norm(this.mapFocus)
          const provinceFiltered = rows.filter(row => _norm(row.province) === targetProvince)
          if (provinceFiltered.length > 0) {
            rows = provinceFiltered
          }
        }
      }

      const filterDims = Array.isArray(this.filterDimensions) ? this.filterDimensions : []

      if (filterDims.length > 0) {
        const dims = Array.from(new Set(filterDims.map(f => String(f))))
        const selections = this.filterSelections || {}

        const selectionSets = {}
        for (const field of dims) {
          const raw = selections[field]
          if (Array.isArray(raw)) {
            const arr = raw.map(v => String(v))
            selectionSets[field] = new Set(arr)
          } else {
            selectionSets[field] = null
          }
        }

        rows = rows.filter(row => {
          for (const field of dims) {
            const set = selectionSets[field]
            if (!set) continue // no explicit filter for this field
            if (set.size === 0) return false // explicit "no values" selection

            const val = row[field]
            const strVal = String(val)
            if (!set.has(strVal)) return false
          }
          return true
        })
      }

      this.filteredData = rows
      this.locationRowsCache = {}
      this.locationAggregatesCache = {}
      this._rebuildLocationIndex()
      this.updateColorScale()
    },
    
    setFilterDimensions(fields) {
      const nextFields = Array.isArray(fields) ? fields : []
      const nextSelections = {}
      const current = this.filterSelections || {}
      for (const f of nextFields) {
        const existing = current[f]
        if (Array.isArray(existing)) {
          nextSelections[f] = existing.slice()
        }
      }
      this.filterDimensions = nextFields
      this.filterSelections = nextSelections
      this.applyLegendFilter()
    },

    setValueFields(defs) {
      const metricSet = new Set(this.availableMetrics || [])
      const cleaned = Array.isArray(defs)
        ? defs
            .filter(d => d && typeof d.field === 'string' && d.field)
            .map(d => ({
              field: d.field,
              agg: d.agg === 'avg' || d.agg === 'count' ? d.agg : 'sum'
            }))
        : []
      this.valueFields = cleaned

      const primaryMetrics = []
      for (const v of cleaned) {
        if (metricSet.has(v.field) && v.agg !== 'count') {
          primaryMetrics.push(v.field)
        }
      }
      this.selectedMetrics = primaryMetrics
      const first = primaryMetrics.length > 0 ? primaryMetrics[0] : null
      this.setSelectedMetric(first)
      this.locationAggregatesCache = {}
    },

    // Batch pivot configuration updates (filters, values)
    // so we only recompute filteredData once via applyLegendFilter.
    updatePivotConfig(payload) {
      const filters = payload && Array.isArray(payload.filters)
        ? payload.filters.map(f => String(f))
        : []
      const valueDefs = payload && Array.isArray(payload.valueDefs)
        ? payload.valueDefs
        : []

      // Filters + filterSelections (mirror setFilterDimensions semantics)
      const currentSelections = this.filterSelections || {}
      const nextSelections = {}
      const dimKeysToKeep = new Set(filters.map(f => String(f)))
      for (const [fieldKey, sel] of Object.entries(currentSelections)) {
        if (dimKeysToKeep.has(fieldKey) && Array.isArray(sel)) {
          nextSelections[fieldKey] = sel.slice()
        }
      }
      this.filterDimensions = filters
      this.filterSelections = nextSelections

      // Values + primary metrics (mirror setValueFields semantics, without
      // calling setSelectedMetric to avoid extra updateColorScale calls)
      const metricSet = new Set(this.availableMetrics || [])
      const cleaned = valueDefs
        .filter(d => d && typeof d.field === 'string' && d.field)
        .map(d => ({
          field: d.field,
          agg: d.agg === 'avg' || d.agg === 'count' ? d.agg : 'sum'
        }))

      this.valueFields = cleaned

      const primaryMetrics = []
      for (const v of cleaned) {
        if (metricSet.has(v.field) && v.agg !== 'count') {
          primaryMetrics.push(v.field)
        }
      }
      this.selectedMetrics = primaryMetrics
      this.selectedMetric = primaryMetrics.length > 0 ? primaryMetrics[0] : null

      // Recompute filteredData, location index and color scale once
      this.applyLegendFilter()
    },

    setFilterSelectionsForField(field, values) {
      const key = String(field)
      const current = this.filterSelections || {}
      const next = { ...current }

      if (values == null) {
        // No explicit filter for this field
        delete next[key]
      } else if (Array.isArray(values)) {
        next[key] = values
      } else {
        delete next[key]
      }

      this.filterSelections = next
      this.applyLegendFilter()
    },

    toggleFilterSelection(field, value) {
      const key = String(field)
      const val = String(value)
      const current = this.filterSelections || {}
      const existingRaw = current[key]
      const existing = Array.isArray(existingRaw) ? existingRaw.map(v => String(v)) : []
      const set = new Set(existing)
      if (set.has(val)) set.delete(val); else set.add(val)
      this.setFilterSelectionsForField(key, Array.from(set))
    },

    clearFilterSelections(field) {
      if (!field) return
      this.setFilterSelectionsForField(field, null)
    },
    
    _rebuildLocationIndex() {
      const index = {}
      const rows = this.filteredData || []
      for (const r of rows) {
        const regionVars = _expandVariants(r.region)
        const provinceVars = _expandVariants(r.province)
        const cityVars = _expandVariants(r.city)

        for (const v of regionVars) {
          if (!index[v]) index[v] = r
        }
        for (const v of provinceVars) {
          if (!index[v]) index[v] = r
        }
        for (const v of cityVars) {
          if (!index[v]) index[v] = r
        }
      }
      this.locationRowIndex = index
    },
    
    updateColorScale() {
      if (this.selectedMetric) {
        const stats = this.metricStats
        this.colorScale.min = stats.min
        this.colorScale.max = stats.max
        this.colorScale.breaks = null // Clear quantile breaks for metric mode
      } else if (Array.isArray(this.valueFields) && this.valueFields.length > 0) {
        // Compute actual values and create quantile breaks for better color distribution
        const values = this._computeLocationValues()
        if (values.length > 0) {
          const sorted = [...values].sort((a, b) => a - b)
          const numColors = (this.colorScale.colors || []).length || 8
          
          // Create quantile breaks for each color bucket
          const breaks = []
          for (let i = 0; i <= numColors; i++) {
            const idx = Math.min(Math.floor((i / numColors) * sorted.length), sorted.length - 1)
            breaks.push(sorted[idx])
          }
          
          this.colorScale.min = 0
          this.colorScale.max = sorted[sorted.length - 1]
          this.colorScale.breaks = breaks // Store breaks for quantile-based coloring
        } else {
          this.colorScale.min = 0
          this.colorScale.max = 1
          this.colorScale.breaks = null
        }
      } else {
        this.colorScale.min = 0
        this.colorScale.max = 100
        this.colorScale.breaks = null
      }
      // Pre-compute usable colors (excluding white) for performance
      const palette = this.colorScale.colors || []
      this.colorScale.usableColors = palette.filter(c =>
        typeof c === 'string' && c.trim().toLowerCase() !== '#ffffff'
      )
    },

    // Compute aggregated values for all locations in current geoData
    // Excludes parent outline features to prevent skewing the color scale
    _computeLocationValues() {
      const values = []
      const features = this.geoData?.features || []
      const defs = Array.isArray(this.valueFields) ? this.valueFields : []
      
      if (defs.length === 0 || features.length === 0) return values

      // Determine current map level to skip parent outline features
      const mapLevel = this.mapLevel
      const hasFocus = !!this.mapFocus
      const hasSubdivisions = Array.isArray(this.selectedSubdivisions) && this.selectedSubdivisions.length > 0

      for (const feature of features) {
        const props = feature.properties || {}
        
        // Skip parent outline features - they aggregate all child data and skew the scale
        // In regions view with focus: skip region outline (has ADM1_EN but not ADM2_EN)
        // In provinces view with focus: skip province outline (has ADM2_EN but not ADM3_EN)
        if (hasFocus && hasSubdivisions) {
          if (mapLevel === 'regions') {
            // Skip region outline feature (has region name but no province/city)
            if (props.ADM1_EN && !props.ADM2_EN && !props.ADM3_EN) {
              continue
            }
          } else if (mapLevel === 'provinces') {
            // Skip province outline feature (has province name but no city)
            if (props.ADM2_EN && !props.ADM3_EN) {
              continue
            }
          }
        }
        
        const rawName =
          props.ADM3_EN ||
          props.ADM2_EN ||
          props.ADM1_EN ||
          props.ADM0_EN ||
          props.NAME_2 ||
          props.NAME_1 ||
          props.NAME_0 ||
          ''
        
        if (!rawName) continue
        
        // Determine strict match level based on feature properties
        let strictLevel = null
        if (props.ADM3_EN) {
          strictLevel = 'city'
        } else if (props.ADM2_EN) {
          strictLevel = 'province'
        } else if (props.ADM1_EN) {
          strictLevel = 'region'
        }
        
        // Normalize location name for consistent matching
        const locationName = normalizeLocationName(rawName)

        const aggregates = this.getLocationAggregates(locationName, strictLevel)
        if (!aggregates || !aggregates.valueSummaries) continue

        for (const summary of aggregates.valueSummaries) {
          if (!summary) continue
          
          let value = null
          if (summary.agg === 'count' && typeof summary.total === 'number') {
            value = summary.total
          } else if (summary.agg === 'avg' && summary.avg != null && !isNaN(summary.avg)) {
            value = summary.avg
          } else if (summary.sum != null && !isNaN(summary.sum)) {
            value = summary.sum
          }

          if (value !== null && !isNaN(value) && value > 0) {
            values.push(value)
            break // Use first valid value for this location
          }
        }
      }

      return values
    },
    
    // Helper to find data row by location name with alias matching
    findRowByLocation(location) {
      if (!location) return null
      const locVariants = _expandVariants(location)
      const index = this.locationRowIndex || {}

      // Direct match by variants
      for (const v of locVariants) {
        const key = _norm(v)
        if (index[key]) {
          return index[key]
        }
      }

      // Alias-group matching including canonical name
      for (const [canonical, aliases] of Object.entries(REGION_ALIASES)) {
        const aliasSet = new Set(aliases.map(a => _norm(a)))
        aliasSet.add(_norm(canonical))
        let locationInGroup = false
        for (const v of locVariants) {
          if (aliasSet.has(v)) { locationInGroup = true; break }
        }
        if (!locationInGroup) continue

        for (const a of aliasSet) {
          if (index[a]) {
            return index[a]
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
      // No data or invalid value -> render polygon with white fill
      if (value === null || value === undefined || isNaN(value) || value === 0) return '#ffffff'

      const { min, max, breaks, usableColors: precomputed } = this.colorScale
      
      // Use pre-computed usable colors for performance
      const usableColors = Array.isArray(precomputed) && precomputed.length > 0
        ? precomputed
        : ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8']

      if (usableColors.length === 0) {
        return '#ffffff'
      }

      // If min equals max (single value), use the middle color in the palette
      if (min === max) {
        return usableColors[Math.floor(usableColors.length / 2)]
      }

      // Use quantile breaks if available for better distribution
      if (Array.isArray(breaks) && breaks.length > 1) {
        // Find which bucket the value falls into
        for (let i = 0; i < usableColors.length; i++) {
          const lower = breaks[i] || 0
          const upper = breaks[i + 1] !== undefined ? breaks[i + 1] : Infinity
          if (value >= lower && value <= upper) {
            return usableColors[i]
          }
        }
        // Fallback to last color if value exceeds all breaks
        return usableColors[usableColors.length - 1]
      }

      // Fallback to linear interpolation
      const normalized = (value - min) / (max - min)
      const clamped = Math.max(0, Math.min(1, normalized))
      const lastIndex = usableColors.length - 1
      const index = Math.floor(clamped * lastIndex)

      return usableColors[Math.max(0, Math.min(lastIndex, index))]
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
    
    // Get all filtered rows that belong to the given location name, matching
    // by city, then province, then region (using variant-aware region matching).
    // When strictLevel is specified, only match at that level (no fallback to parent levels).
    _getRowsForLocation(location, strictLevel = null) {
      if (!location) return []
      const cacheKey = strictLevel ? `${_norm(location)}__${strictLevel}` : _norm(location)
      if (this.locationRowsCache && this.locationRowsCache[cacheKey]) {
        return this.locationRowsCache[cacheKey]
      }
      const rows = this.filteredData || []
      const results = []
      const targetVariants = _expandVariants(location)

      for (const r of rows) {
        if (!r) continue

        let matched = false

        // City-level match (variant-aware, handles "City of X" vs "X City")
        if (strictLevel === null || strictLevel === 'city') {
          if (r.city) {
            const cityVars = _expandVariants(r.city)
            for (const v of cityVars) {
              if (targetVariants.has(v)) {
                results.push(r)
                matched = true
                break
              }
            }
          }
        }
        if (matched) continue
        if (strictLevel === 'city') continue // Don't fallback if strict city matching

        // Province-level match (variant-aware)
        if (strictLevel === null || strictLevel === 'province') {
          if (r.province) {
            const provVars = _expandVariants(r.province)
            for (const v of provVars) {
              if (targetVariants.has(v)) {
                results.push(r)
                matched = true
                break
              }
            }
          }
        }
        if (matched) continue
        if (strictLevel === 'province') continue // Don't fallback if strict province matching

        // Region-level match (uses alias-aware matcher)
        if (strictLevel === null || strictLevel === 'region') {
          if (_isRegionMatch(r.region, location)) {
            results.push(r)
          }
        }
      }

      if (!this.locationRowsCache) this.locationRowsCache = {}
      this.locationRowsCache[cacheKey] = results
      return results
    },

    // Aggregate current valueFields for a given location using filteredData.
    // For agg === 'count' on a categorical field, returns counts per value.
    // For numeric fields (sum/avg), returns sum, avg and row count.
    // strictLevel: 'city', 'province', or 'region' - only match at that level
    getLocationAggregates(location, strictLevel = null) {
      if (!location) return null

      const cacheKey = strictLevel ? `${_norm(location)}__${strictLevel}` : _norm(location)
      const cache = this.locationAggregatesCache || {}
      if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) {
        return cache[cacheKey]
      }

      const rows = this._getRowsForLocation(location, strictLevel)
      if (!rows || rows.length === 0) {
        // Cache null result to avoid repeated lookups
        if (!this.locationAggregatesCache) this.locationAggregatesCache = {}
        this.locationAggregatesCache[cacheKey] = null
        return null
      }

      const defs = Array.isArray(this.valueFields) ? this.valueFields : []
      if (defs.length === 0) return null

      const summaries = []

      for (const def of defs) {
        if (!def || !def.field) continue
        const field = def.field
        const agg = def.agg || 'sum'

        if (agg === 'count') {
          const counts = {}
          let total = 0
          for (const row of rows) {
            const raw = row[field]
            const isBlank =
              raw === null ||
              raw === undefined ||
              (typeof raw === 'string' && raw.trim() === '')

            const key = isBlank ? '(blank)' : String(raw).trim()
            counts[key] = (counts[key] || 0) + 1

            // Only non-blank values contribute to the total used for coloring
            if (!isBlank) {
              total += 1
            }
          }
          summaries.push({ field, agg: 'count', total, counts })
        } else {
          let sum = 0
          let n = 0
          for (const row of rows) {
            const v = parseFloat(row[field])
            if (!isNaN(v)) {
              sum += v
              n += 1
            }
          }
          const avg = n > 0 ? sum / n : null
          summaries.push({
            field,
            agg,
            sum: n > 0 ? sum : null,
            avg,
            count: n
          })
        }
      }

      if (summaries.length === 0) return null

      const result = {
        rowCount: rows.length,
        valueSummaries: summaries
      }

      if (!this.locationAggregatesCache) this.locationAggregatesCache = {}
      this.locationAggregatesCache[cacheKey] = result
      return result
    },
    
    setMapLevel(level) {
      this.mapLevel = level
      this.mapFocus = null // Clear focus when changing levels
      this.applyLegendFilter()
    },
    
    setMapFocus(location) {
      this.mapFocus = location
      this.applyLegendFilter()
    },
    
    setSelectedSubdivisions(subdivisions) {
      this.selectedSubdivisions = subdivisions
    },
    
    setHideInternalBoundaries(hide) {
      this.hideInternalBoundaries = hide
    },
    
    setShowCalloutLabels(show) {
      this.showCalloutLabels = show
    },

    setCalloutBackgroundEnabled(show) {
      this.calloutBackgroundEnabled = !!show
    }
  }
})
