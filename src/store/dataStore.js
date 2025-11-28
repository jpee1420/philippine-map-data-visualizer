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
    legendField: null, // Categorical field for legend (e.g., gender, nationality)
    legendCategories: [], // Unique categories from legend field
    legendSelected: null, // null = all categories selected (no filter), [] or array = explicit selection
    filterDimensions: [],
    filterSelections: {},
    availableMetrics: [],
    axisFields: [], // Order of axis/category fields for grouping and labels
    valueFields: [], // [{ field, agg }] for metrics and counts
    mapLevel: 'country', // 'country', 'regions', or 'provinces'
    mapFocus: null, // Specific location to focus on (e.g., "Ilocos Region")
    selectedSubdivisions: [], // Array of selected subdivisions to show boundaries
    hideInternalBoundaries: false, // Hide internal boundaries
    showCalloutLabels: false, // Show callout diagram labels on map
    calloutBackgroundEnabled: false, // Show background card and border for callout labels
    colorScale: {
      min: 0,
      max: 100,
      colors: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'] // Default to blue
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
      this.legendField = null
      this.legendCategories = []
      this.legendSelected = null
      this.filterDimensions = []
      this.filterSelections = {}
      this.axisFields = []
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
      this.legendField = null
      this.legendCategories = []
      this.legendSelected = []
      this.filterDimensions = []
      this.filterSelections = {}
      this.axisFields = []
      this.valueFields = []
      this.locationRowsCache = {}
      this.locationAggregatesCache = {}
      this.updateColorScale()
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

      const filterDimsRaw = [
        ...(Array.isArray(this.filterDimensions) ? this.filterDimensions : []),
        ...(Array.isArray(this.axisFields) ? this.axisFields : [])
      ]

      if (filterDimsRaw.length > 0) {
        const dims = Array.from(new Set(filterDimsRaw.map(f => String(f))))
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

      if (this.legendField && Array.isArray(this.legendSelected)) {
        if (this.legendSelected.length === 0) {
          // Explicit "no categories" selection -> nothing passes the legend filter
          rows = []
        } else {
          const selectedSet = new Set(this.legendSelected.map(v => String(v)))
          rows = rows.filter(row => selectedSet.has(String(row[this.legendField])))
        }
      }

      this.filteredData = rows
      this.locationRowsCache = {}
      this.locationAggregatesCache = {}
      this._rebuildLocationIndex()
      this.updateColorScale()
    },
    
    setLegendSelections(values) {
      if (values === null) {
        // null = no explicit filter (all categories selected)
        this.legendSelected = null
      } else if (Array.isArray(values)) {
        this.legendSelected = values
      } else {
        this.legendSelected = null
      }
      this.applyLegendFilter()
    },
    
    toggleLegendSelection(value) {
      const val = String(value)
      const all = (this.legendCategories || []).map(v => String(v))
      const currentArray = Array.isArray(this.legendSelected)
        ? this.legendSelected.map(v => String(v))
        : all.slice()

      const set = new Set(currentArray)
      if (set.has(val)) {
        set.delete(val)
      } else {
        set.add(val)
      }

      const next = Array.from(set)
      if (next.length === all.length) {
        this.legendSelected = null
      } else {
        this.legendSelected = next
      }
      this.applyLegendFilter()
    },
    
    clearLegendSelections() {
      // Reset to all categories selected (no explicit filter list)
      this.legendSelected = null
      this.applyLegendFilter()
    },

    setLegendField(field) {
      this.legendField = field || null
      // Reset legend filter when field changes: null means no explicit filter (all categories)
      this.legendSelected = null
      if (field && this.dataset.length > 0) {
        const categories = [...new Set(
          this.dataset
            .map(row => row[field])
            .filter(v => v !== null && v !== undefined && v !== '')
        )]
        this.legendCategories = categories
      } else {
        this.legendCategories = []
      }
      this.applyLegendFilter()
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

    setAxisFields(fields) {
      this.axisFields = Array.isArray(fields) ? fields.slice() : []
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

    // Batch pivot configuration updates (filters, legend, axis, values)
    // so we only recompute filteredData once via applyLegendFilter.
    updatePivotConfig(payload) {
      const filters = payload && Array.isArray(payload.filters)
        ? payload.filters.map(f => String(f))
        : []
      const legendField = payload && payload.legendField
        ? String(payload.legendField)
        : null
      const axisFields = payload && Array.isArray(payload.axisFields)
        ? payload.axisFields.map(f => String(f))
        : []
      const valueDefs = payload && Array.isArray(payload.valueDefs)
        ? payload.valueDefs
        : []

      // Filters + filterSelections (mirror setFilterDimensions semantics)
      const currentSelections = this.filterSelections || {}
      const nextSelections = {}
      const dimKeysToKeep = new Set(
        [...filters, ...axisFields].map(f => String(f))
      )
      for (const [fieldKey, sel] of Object.entries(currentSelections)) {
        if (dimKeysToKeep.has(fieldKey) && Array.isArray(sel)) {
          nextSelections[fieldKey] = sel.slice()
        }
      }
      this.filterDimensions = filters
      this.filterSelections = nextSelections

      // Legend field + categories (mirror setLegendField semantics)
      const prevLegendField = this.legendField
      this.legendField = legendField || null
      if (this.legendField && this.dataset.length > 0) {
        const categories = [...new Set(
          this.dataset
            .map(row => row[this.legendField])
            .filter(v => v !== null && v !== undefined && v !== '')
        )]
        this.legendCategories = categories
      } else {
        this.legendCategories = []
      }

      if (this.legendField !== prevLegendField) {
        // Field changed or was cleared -> clear explicit legend filters
        this.legendSelected = null
      }

      // Axis fields
      this.axisFields = axisFields

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
      } else if (Array.isArray(this.valueFields) && this.valueFields.some(v => v && v.agg === 'count')) {
        const totalRows = (this.filteredData || []).length
        this.colorScale.min = 0
        this.colorScale.max = Math.max(1, totalRows || 0)
      } else {
        this.colorScale.min = 0
        this.colorScale.max = 100
      }
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
    
    // Get all filtered rows that belong to the given location name, matching
    // by city, then province, then region (using variant-aware region matching).
    _getRowsForLocation(location) {
      if (!location) return []
      const targetNorm = _norm(location)
      if (this.locationRowsCache && this.locationRowsCache[targetNorm]) {
        return this.locationRowsCache[targetNorm]
      }
      const rows = this.filteredData || []
      const results = []
      const targetVariants = _expandVariants(location)

      for (const r of rows) {
        if (!r) continue

        let matched = false

        // City-level match (variant-aware, handles "City of X" vs "X City")
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
        if (matched) continue

        // Province-level match (variant-aware)
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
        if (matched) continue

        // Region-level match (uses alias-aware matcher)
        if (_isRegionMatch(r.region, location)) {
          results.push(r)
        }
      }

      if (!this.locationRowsCache) this.locationRowsCache = {}
      this.locationRowsCache[targetNorm] = results
      return results
    },

    // Aggregate current valueFields for a given location using filteredData.
    // For agg === 'count' on a categorical field, returns counts per value.
    // For numeric fields (sum/avg), returns sum, avg and row count.
    getLocationAggregates(location) {
      if (!location) return null

      const cacheKey = _norm(location)
      const cache = this.locationAggregatesCache || {}
      if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) {
        return cache[cacheKey]
      }

      const rows = this._getRowsForLocation(location)
      if (!rows || rows.length === 0) return null

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
            const key = raw === null || raw === undefined || raw === ''
              ? '(blank)'
              : String(raw)
            counts[key] = (counts[key] || 0) + 1
            total += 1
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
