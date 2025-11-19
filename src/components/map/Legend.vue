<template>
  <div class="legend" v-if="showLegend">
    <n-card size="small" :bordered="false">
      <div class="legend-content">
        <!-- Categorical Legend (primary) -->
        <div v-if="dataStore.legendField && allCategories.length > 0" style="margin-bottom: 12px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <n-text strong>
              {{ dataStore.legendField }}
            </n-text>
            <n-text v-if="dataStore.legendSelected.length > 0" depth="3" style="font-size:12px; cursor:pointer;" @click="clearSelections">
              Clear
            </n-text>
          </div>
          
          <div class="category-list">
            <div 
              v-for="(name, idx) in allCategories" 
              :key="name"
              class="category-item"
              :class="{ selected: isSelected(name) }"
              @click="toggle(name)"
            >
              <div 
                class="category-color"
                :style="{ backgroundColor: getCategoryColor(getOriginalIndex(name)) }"
              />
              <n-text style="font-size: 12px;">
                {{ name }}<span v-if="hasTotals">: {{ formatTotal(categoryTotals[name]) }}</span>
              </n-text>   
            </div>
          </div>
        </div>

        <!-- Filter Dimension Legends -->
        <div
          v-for="panel in filterPanels"
          :key="panel.field"
          style="margin-bottom: 12px;"
        >
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <n-text strong>
              {{ panel.field }}
            </n-text>
            <n-text
              v-if="panel.hasSelection"
              depth="3"
              style="font-size:12px; cursor:pointer;"
              @click="clearFilter(panel.field)"
            >
              Clear
            </n-text>
          </div>

          <div class="category-list">
            <div
              v-for="name in panel.categories"
              :key="name"
              class="category-item"
              :class="{ selected: isFilterSelected(panel.field, name) }"
              @click="toggleFilter(panel.field, name)"
            >
              <div
                class="category-color"
                :style="{ backgroundColor: getCategoryColor(panel.categories.indexOf(name)) }"
              />
              <n-text style="font-size: 12px;">
                {{ name }}
              </n-text>
            </div>
          </div>
        </div>
        
        <!-- Numeric Color Scale Legend (only when no categorical legend is active) -->
        <div v-if="!dataStore.legendField && dataStore.selectedMetric" class="legend-content">
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
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { NCard, NText } from 'naive-ui'
import { useDataStore } from '@/store/dataStore'

const dataStore = useDataStore()

const colorScale = computed(() => dataStore.colorScale)

// Always show all categories (interactive legend)
const allCategories = computed(() => {
  return dataStore.legendCategories || []
})

const getOriginalIndex = (name) => {
  return (dataStore.legendCategories || []).findIndex(n => n === name)
}

const isSelected = (name) => {
  return (dataStore.legendSelected || []).map(String).includes(String(name))
}

const toggle = (name) => {
  dataStore.toggleLegendSelection(name)
}

const clearSelections = () => {
  dataStore.clearLegendSelections()
}

const filterPanels = computed(() => {
  const dims = dataStore.filterDimensions || []
  const rows = dataStore.dataset || []
  const selections = dataStore.filterSelections || {}
  const panels = []
  for (const field of dims) {
    const set = new Set()
    for (const row of rows) {
      const v = row[field]
      if (v !== null && v !== undefined && v !== '') {
        set.add(v)
      }
    }
    const categories = Array.from(set)
    const selected = Array.isArray(selections[field]) ? selections[field] : []
    panels.push({
      field,
      categories,
      hasSelection: selected.length > 0
    })
  }
  return panels
})

const isFilterSelected = (field, name) => {
  const selections = (dataStore.filterSelections && dataStore.filterSelections[field]) || []
  return selections.map(String).includes(String(name))
}

const toggleFilter = (field, name) => {
  dataStore.toggleFilterSelection(field, name)
}

const clearFilter = (field) => {
  dataStore.clearFilterSelections(field)
}

// Per-category totals for the selected metric
const hasTotals = computed(() => !!dataStore.selectedMetric && !!dataStore.legendField)
const categoryTotals = computed(() => {
  const totals = {}
  if (!dataStore.selectedMetric || !dataStore.legendField) return totals
  for (const name of dataStore.legendCategories) totals[name] = 0
  // Use the full dataset so totals remain stable even when selections are applied
  for (const row of dataStore.dataset || []) {
    const cat = row[dataStore.legendField]
    const val = parseFloat(row[dataStore.selectedMetric])
    if (cat != null && !isNaN(val)) {
      if (!(cat in totals)) totals[cat] = 0
      totals[cat] += val
    }
  }
  return totals
})

const formatTotal = (num) => {
  if (num == null || isNaN(num)) return '0'
  return Number(num).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

const showLegend = computed(() => {
  return (
    (dataStore.legendField && allCategories.value.length > 0) ||
    dataStore.selectedMetric ||
    (filterPanels.value && filterPanels.value.length > 0)
  )
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
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
}

.category-item.selected {
  background: #f0f2ff;
  outline: 1px solid #c7d2fe;
}

.category-color {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
</style>
