<template>
  <div class="legend" v-if="showLegend">
    <n-card size="small" :bordered="false">
      <!-- Categorical Legend -->
      <div v-if="dataStore.legendField && visibleCategories.length > 0" class="legend-content">
        <n-text strong style="margin-bottom: 12px; display: block;">
          {{ dataStore.legendField }}
        </n-text>
        
        <div class="category-list">
          <div 
            v-for="(categoryInfo, index) in visibleCategories" 
            :key="categoryInfo.name"
            class="category-item"
          >
            <div 
              class="category-color"
              :style="{ backgroundColor: getCategoryColor(categoryInfo.originalIndex) }"
            />
            <n-text style="font-size: 12px;">
              {{ categoryInfo.name }}
            </n-text>
          </div>
        </div>
      </div>
      
      <!-- Numeric Color Scale Legend -->
      <div v-else-if="dataStore.selectedMetric" class="legend-content">
        <n-text strong style="margin-bottom: 12px; display: block;">
          {{ dataStore.selectedMetric }}
        </n-text>
        
        <div class="color-scale">
          <div 
            v-for="(color, index) in colorScale.colors" 
            :key="index"
            class="color-block"
            :style="{ backgroundColor: color }"
          />
        </div>
        
        <div class="scale-labels">
          <n-text depth="3" style="font-size: 12px;">
            {{ colorScale.min.toLocaleString('en-US', { maximumFractionDigits: 0 }) }}
          </n-text>
          <n-text depth="3" style="font-size: 12px;">
            {{ colorScale.max.toLocaleString('en-US', { maximumFractionDigits: 0 }) }}
          </n-text>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { NCard, NText } from 'naive-ui'
import { useDataStore } from '@/store/dataStore'
import { normalizeGADMName } from '@/utils/nameUtils'

const dataStore = useDataStore()

const colorScale = computed(() => dataStore.colorScale)

// Filter categories to only show those visible on the map
const visibleCategories = computed(() => {
  if (!dataStore.legendField || !dataStore.legendCategories.length) {
    return []
  }
  
  // Determine which locations are currently visible on the map
  let visibleLocationNames = []
  
  if (dataStore.geoData && dataStore.geoData.features) {
    // Extract location names from currently loaded GeoJSON features
    visibleLocationNames = dataStore.geoData.features.map(feature => {
      const props = feature.properties || {}
      const rawName = props.NAME_2 || props.NAME_1 || props.NAME_0 || props.COUNTRY ||
        props.shapeName || props.shapeGroup || props.shapeID || 
        props.name || props.region || props.province || props.city || ''
      return normalizeGADMName(rawName)
    }).filter(Boolean)
    
    // Note: selectedSubdivisions now store PSGC codes; geoData is already filtered
    // to include parent + selected subdivisions, so no additional filtering by names here.
  }
  
  // If no GeoJSON loaded or no visible locations, show all categories
  if (visibleLocationNames.length === 0) {
    return dataStore.legendCategories.map((name, originalIndex) => ({ name, originalIndex }))
  }
  
  // Find which categories have data for the visible locations
  const visibleCategoriesSet = new Set()
  
  visibleLocationNames.forEach(locationName => {
    const row = dataStore.findRowByLocation(locationName)
    if (row && row[dataStore.legendField]) {
      visibleCategoriesSet.add(row[dataStore.legendField])
    }
  })
  
  // Return categories that are actually visible, preserving original indices for consistent colors
  return dataStore.legendCategories
    .map((name, originalIndex) => ({ name, originalIndex }))
    .filter(categoryInfo => visibleCategoriesSet.has(categoryInfo.name))
})

const showLegend = computed(() => {
  return (dataStore.legendField && visibleCategories.value.length > 0) || dataStore.selectedMetric
})

// Generate distinct colors for categories
const categoryColors = [
  '#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a',
  '#fee140', '#30cfd0', '#a8edea', '#fbc2eb', '#fdcbf1',
  '#e0c3fc', '#8ec5fc', '#f5576c', '#ffa751', '#4facfe'
]

const getCategoryColor = (index) => {
  return categoryColors[index % categoryColors.length]
}
</script>

<style scoped>
.legend {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  min-width: 200px;
}

.legend-content {
  display: flex;
  flex-direction: column;
}

.color-scale {
  display: flex;
  height: 20px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.color-block {
  flex: 1;
}

.scale-labels {
  display: flex;
  justify-content: space-between;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-color {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
</style>
