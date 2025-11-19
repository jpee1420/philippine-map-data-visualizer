<template>
  <div class="legend" v-if="showLegend">
    <div class="legend-content">
      <!-- Categorical Legend (primary) -->
      <n-card
        v-if="dataStore.legendField && allCategories.length > 0"
        size="small"
        :bordered="false"
        class="legend-card"
      >
        <div class="legend-section-header">
          <n-text strong>
            {{ dataStore.legendField }}
          </n-text>
          <div class="legend-section-actions">
            <n-text
              v-if="dataStore.legendSelected.length > 0"
              depth="3"
              style="font-size:12px; cursor:pointer;"
              @click="clearSelections"
            >
              Clear
            </n-text>
            <button
              class="legend-collapse-btn"
              type="button"
              @click="toggleCategoryCollapse"
            >
              {{ collapsedCategory ? 'Show' : 'Hide' }}
            </button>
          </div>
        </div>
        
        <div v-if="!collapsedCategory" class="legend-card-body">
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
      </n-card>

      <!-- Filter Dimension Legends -->
      <n-card
        v-for="panel in filterPanels"
        :key="panel.field"
        size="small"
        :bordered="false"
        class="legend-card"
      >
        <div class="legend-section-header">
          <n-text strong>
            {{ panel.field }}
          </n-text>
          <div class="legend-section-actions">
            <n-text
              v-if="panel.hasSelection"
              depth="3"
              style="font-size:12px; cursor:pointer;"
              @click="clearFilter(panel.field)"
            >
              Clear
            </n-text>
            <button
              class="legend-collapse-btn"
              type="button"
              @click="toggleFilterCollapse(panel.field)"
            >
              {{ isFilterCollapsed(panel.field) ? 'Show' : 'Hide' }}
            </button>
          </div>
        </div>

        <div v-if="!isFilterCollapsed(panel.field)" class="legend-card-body">
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
      </n-card>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
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

const collapsedCategory = ref(false)
const collapsedNumeric = ref(false)
const collapsedFilters = ref({})

const toggleCategoryCollapse = () => {
  collapsedCategory.value = !collapsedCategory.value
}

const toggleNumericCollapse = () => {
  collapsedNumeric.value = !collapsedNumeric.value
}

const isFilterCollapsed = (field) => {
  const key = String(field)
  return !!collapsedFilters.value[key]
}

const toggleFilterCollapse = (field) => {
  const key = String(field)
  collapsedFilters.value = {
    ...collapsedFilters.value,
    [key]: !collapsedFilters.value[key]
  }
}

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
  // Use filteredData when available so totals always reflect the currently visible data
  const rows = dataStore.filteredData && dataStore.filteredData.length > 0
    ? dataStore.filteredData
    : dataStore.dataset || []
  for (const row of rows) {
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
  max-width: 50%;
}

.legend-content {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
}

.legend-card {
  flex: 0 0 auto;
  margin-bottom: 12px;
  margin-right: 12px;
  width: 240px;
}

.legend-card-body {
  max-height: 220px;
  overflow-y: auto;
}

.legend-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.legend-section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-collapse-btn {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
}

.legend-collapse-btn:hover {
  color: #111827;
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
