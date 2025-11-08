import { defineStore } from 'pinia'

// Region name aliases for matching GeoJSON with CSV data
const REGION_ALIASES = {
  'NCR': ['National Capital Region', 'NCR', 'Metro Manila'],
  'CAR': ['Cordillera Administrative Region', 'CAR', 'Cordillera'],
  'Ilocos Region': ['Ilocos Region', 'Region I', 'Region 1'],
  'Cagayan Valley': ['Cagayan Valley', 'Region II', 'Region 2'],
  'Central Luzon': ['Central Luzon', 'Region III', 'Region 3'],
  'Calabarzon': ['CALABARZON', 'Calabarzon', 'Region IV-A', 'Region 4A'],
  'Mimaropa': ['MIMAROPA', 'Mimaropa', 'Region IV-B', 'Region 4B'],
  'Bicol Region': ['Bicol Region', 'Region V', 'Region 5'],
  'Western Visayas': ['Western Visayas', 'Region VI', 'Region 6'],
  'Central Visayas': ['Central Visayas', 'Region VII', 'Region 7'],
  'Eastern Visayas': ['Eastern Visayas', 'Region VIII', 'Region 8'],
  'Zamboanga Peninsula': ['Zamboanga Peninsula', 'Region IX', 'Region 9'],
  'Northern Mindanao': ['Northern Mindanao', 'Region X', 'Region 10'],
  'Davao Region': ['Davao Region', 'Region XI', 'Region 11'],
  'Soccsksargen': ['SOCCSKSARGEN', 'Soccsksargen', 'Region XII', 'Region 12'],
  'Caraga': ['Caraga', 'Region XIII', 'Region 13'],
  'BARMM': ['BARMM', 'Bangsamoro', 'ARMM']
}

export const useDataStore = defineStore('dataStore', {
  state: () => ({
    dataset: [],
    filteredData: [],
    geoData: null,
    selectedMetric: null,
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
    hideInternalBoundaries: false, // Hide internal boundaries
    showCalloutLabels: false, // Show callout diagram labels on map
    colorScale: {
      min: 0,
      max: 100,
      colors: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15']
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
      this.dataset = data
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
    
    getValueForLocation(location) {
      if (!this.selectedMetric) return null
      
      // Try exact match first
      let row = this.filteredData.find(r => 
        r.region === location || 
        r.province === location || 
        r.city === location
      )
      
      // If no exact match, try case-insensitive and alias matching
      if (!row) {
        const locationLower = location.toLowerCase()
        row = this.filteredData.find(r => {
          // Check if any field matches case-insensitively
          if (r.region?.toLowerCase() === locationLower ||
              r.province?.toLowerCase() === locationLower ||
              r.city?.toLowerCase() === locationLower) {
            return true
          }
          
          // Check aliases
          for (const [canonical, aliases] of Object.entries(REGION_ALIASES)) {
            if (aliases.some(alias => alias.toLowerCase() === locationLower)) {
              // Check if data has any of the aliases
              return aliases.some(alias => 
                r.region?.toLowerCase() === alias.toLowerCase() ||
                r.province?.toLowerCase() === alias.toLowerCase() ||
                r.city?.toLowerCase() === alias.toLowerCase()
              )
            }
          }
          return false
        })
      }
      
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
    
    setHideInternalBoundaries(hide) {
      this.hideInternalBoundaries = hide
    },
    
    setShowCalloutLabels(show) {
      this.showCalloutLabels = show
    }
  }
})
