<template>
  <div class="data-fields-panel">
    <div class="panel-header">
      <n-icon :component="LayersIcon" size="18" />
      <span>Data Fields</span>
    </div>
    
    <div class="panel-content">
      <!-- Available Fields -->
      <div class="fields-section">
        <div class="section-label">Available Fields</div>
        <div class="fields-list">
          <div 
            v-for="field in availableFields" 
            :key="field.name"
            class="field-item"
            draggable="true"
            @dragstart="handleDragStart(field, $event)"
          >
            <n-icon :component="MenuIcon" size="16" class="drag-handle" />
            <span class="field-name">{{ field.name }}</span>
            <n-tag :type="field.type === 'Dim' ? 'info' : 'success'" size="small">
              {{ field.type }}
            </n-tag>
          </div>
        </div>
      </div>
      
      <!-- Map Configuration -->
      <div class="fields-section">
        <div class="section-label">Map Configuration</div>
        
        <div class="config-item">
          <label>Value Metrics (Select Multiple)</label>
          <n-select
            v-model:value="selectedMetrics"
            :options="metricOptions"
            multiple
            filterable
            placeholder="Select metrics to display"
            size="small"
            @update:value="handleMetricsChange"
          />
        </div>
        
        <div class="config-item">
          <label>Legend (Category)</label>
          <n-select
            v-model:value="legendField"
            :options="dimensionOptions"
            placeholder="Select category field"
            size="small"
            clearable
            @update:value="handleLegendChange"
          />
          <div v-if="legendField" class="field-hint">
            Groups data by {{ legendField }} (e.g., gender, nationality)
          </div>
        </div>
        
        <div class="config-item">
          <label>Color Scale</label>
          <n-select
            v-model:value="colorScheme"
            :options="colorSchemeOptions"
            size="small"
          />
        </div>
        
        <div class="config-item">
          <label>Show Callout Labels</label>
          <n-switch
            v-model:value="showCallouts"
            @update:value="handleCalloutToggle"
          />
          <div v-if="showCallouts" class="field-hint">
            Display data callouts on map boundaries (scales with zoom)
          </div>
        </div>
      </div>
      
      <!-- Statistics Summary -->
      <div class="fields-section" v-if="dataStore.selectedMetric">
        <div class="section-label">Statistics</div>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Min</span>
            <span class="stat-value">{{ formatNumber(stats.min) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Max</span>
            <span class="stat-value">{{ formatNumber(stats.max) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Avg</span>
            <span class="stat-value">{{ formatNumber(stats.avg) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total</span>
            <span class="stat-value">{{ formatNumber(stats.sum) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { NIcon, NTag, NButton, NSelect, NInput, NSwitch } from 'naive-ui'
import { Layers as LayersIcon, Menu as MenuIcon, Add as AddIcon, Close as CloseIcon } from '@vicons/ionicons5'
import { useDataStore } from '@/store/dataStore'

const dataStore = useDataStore()

// Map configuration fields
const selectedMetrics = ref([])
const legendField = ref(null)
const showCallouts = ref(dataStore.showCalloutLabels)

// Computed metric options from available fields
const metricOptions = computed(() => {
  return availableFields.value
    .filter(field => field.type === 'Mea')
    .map(field => ({
      label: field.name,
      value: field.name
    }))
})

// Computed dimension options for legend (categorical fields)
const dimensionOptions = computed(() => {
  return availableFields.value
    .filter(field => field.type === 'Dim')
    .map(field => ({
      label: field.name,
      value: field.name
    }))
})

// Handle metrics change
const handleMetricsChange = (metrics) => {
  // Update selected metrics array in store
  dataStore.selectedMetrics = metrics || []
  
  if (metrics && metrics.length > 0) {
    // Set the first metric as the primary one for coloring
    dataStore.setSelectedMetric(metrics[0])
  } else {
    dataStore.setSelectedMetric(null)
  }
}

// Handle legend field change
const handleLegendChange = (field) => {
  dataStore.legendField = field
  
  // If legend field is set, extract unique categories
  if (field && dataStore.dataset.length > 0) {
    const categories = [...new Set(dataStore.dataset.map(row => row[field]).filter(Boolean))]
    dataStore.legendCategories = categories
  } else {
    dataStore.legendCategories = []
  }
}

// Handle callout toggle
const handleCalloutToggle = (value) => {
  dataStore.setShowCalloutLabels(value)
}

const colorScheme = ref('blue')

const colorSchemeOptions = [
  { label: 'Default (Red)', value: 'default' },
  { label: 'Blue', value: 'blue' },
  { label: 'Green', value: 'green' },
  { label: 'Purple', value: 'purple' },
  { label: 'Orange', value: 'orange' }
]

// Watch for color scheme changes and update store
watch(colorScheme, (newScheme) => {
  const colorMaps = {
    'default': ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
    'blue': ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'],
    'green': ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
    'purple': ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#756bb1', '#54278f'],
    'orange': ['#feedde', '#fdbe85', '#fd8d3c', '#e6550d', '#a63603']
  }
  
  // Update color scale with new colors
  const newColors = colorMaps[newScheme]
  dataStore.colorScale = {
    ...dataStore.colorScale,
    colors: newColors
  }
})

const availableFields = computed(() => {
  if (!dataStore.dataset || dataStore.dataset.length === 0) {
    return []
  }
  
  const firstRow = dataStore.dataset[0]
  const fields = []
  
  // Detect field types based on data
  Object.keys(firstRow).forEach(key => {
    const sampleValues = dataStore.dataset.slice(0, 100).map(row => row[key])
    const numericValues = sampleValues.filter(v => !isNaN(parseFloat(v)))
    
    // If more than 80% are numeric, it's a measure, otherwise dimension
    const type = (numericValues.length / sampleValues.length) > 0.8 ? 'Mea' : 'Dim'
    
    fields.push({ name: key, type })
  })
  
  return fields
})

const stats = computed(() => dataStore.metricStats)

// Drag and drop handlers
const handleDragStart = (field, event) => {
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('field', JSON.stringify(field))
}

// Number formatting with comma separators
const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0'
  
  // Format with 2 decimal places and add comma separators
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
</script>

<style scoped>
.data-fields-panel {
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e8e8e8;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
  font-weight: 600;
  font-size: 14px;
  color: #1a1a1a;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.fields-section {
  margin-bottom: 24px;
}

.fields-section:last-child {
  margin-bottom: 0;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 12px;
}

.fields-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  cursor: move;
  transition: all 0.2s;
}

.field-item:hover {
  background: #f0f0f0;
  border-color: #d0d0d0;
}

.drag-handle {
  color: #999;
}

.field-name {
  flex: 1;
  font-size: 13px;
  color: #333;
}

.config-item {
  margin-bottom: 16px;
}

.config-item:last-child {
  margin-bottom: 0;
}

.config-item label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  margin-bottom: 8px;
}

.drop-zone {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f8f9fa;
  border: 2px dashed #d0d0d0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 40px;
}

.drop-zone:hover {
  border-color: #667eea;
  background: #f0f2ff;
}

.drop-zone.has-value {
  background: #e8f4f8;
  border-color: #18a058;
  border-style: solid;
}

.drop-zone span {
  flex: 1;
  font-size: 13px;
  color: #333;
}

.drop-zone .n-icon {
  color: #999;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.stat-label {
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

/* Custom scrollbar */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: #f5f5f5;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #d0d0d0;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #b0b0b0;
}

.field-hint {
  margin-top: 6px;
  font-size: 11px;
  color: #666;
  font-style: italic;
}
</style>
