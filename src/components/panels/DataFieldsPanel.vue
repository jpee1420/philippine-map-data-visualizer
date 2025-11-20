<template>
  <div class="data-fields-panel">
    <div class="panel-header">
      <n-icon :component="LayersIcon" size="18" />
      <span>Data Fields</span>
    </div>
    
    <div class="panel-content">
      <!-- Pivot-style fields configuration -->
      <div class="fields-section pivot-section">
        <div class="section-label">Pivot Fields</div>
        
        <!-- Field list with search -->
        <div class="pivot-fields-top">
          <div class="pivot-fields-title">Choose fields to add to report:</div>
          <n-input
            v-model:value="fieldSearch"
            size="small"
            placeholder="Search fields"
            clearable
          />
          <div class="fields-list-container">
            <div class="fields-list">
              <div
                v-for="field in visibleFields"
                :key="field.name"
                class="field-item"
                draggable="true"
                @dragstart="onFieldDragStart(field.name, 'list')"
              >
                <n-checkbox
                  size="small"
                  :checked="isFieldUsed(field.name)"
                  disabled
                />
                <span class="field-name">{{ field.name }}</span>
                <span v-if="field.isMetric" class="metric-badge">Σ</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="pivot-separator"></div>
        
        <!-- 2x2 areas: Filters, Legend, Axis, Values -->
        <div class="pivot-areas-grid">
          <div class="pivot-area">
            <div class="pivot-area-title">Filters</div>
            <div
              class="pivot-drop-zone"
              @dragover.prevent
              @drop="onDropToArea('filters')"
            >
              <div
                v-for="name in filtersArea"
                :key="name"
                class="pivot-chip"
                draggable="true"
                @dragstart="onFieldDragStart(name, 'filters')"
              >
                <n-popover placement="left" trigger="click">
                  <template #trigger>
                    <button type="button" class="chip-trigger">
                      <span class="chip-label">{{ name }}</span>
                      <span class="chip-dropdown-arrow">▼</span>
                    </button>
                  </template>
                  <div class="pivot-popover">
                    <div class="pivot-popover-header">
                      <span class="popover-title">{{ name }}</span>
                      <button
                        v-if="hasFilterSelections(name)"
                        type="button"
                        class="popover-action"
                        @click.stop="clearFilterFieldSelections(name)"
                      >
                        Clear filter
                      </button>
                    </div>
                    <div class="pivot-popover-search">
                      <n-input
                        :value="getFilterSearch(name)"
                        size="tiny"
                        placeholder="Search..."
                        clearable
                        @update:value="val => updateFilterSearch(name, val)"
                      />
                    </div>
                    <div class="pivot-popover-selectall">
                      <n-checkbox
                        :checked="isFilterAllSelected(name)"
                        @update:checked="checked => toggleFilterSelectAll(name, checked)"
                      >
                        (Select All)
                      </n-checkbox>
                    </div>
                    <div class="pivot-popover-list">
                      <div
                        v-for="val in getFilterVisibleValues(name)"
                        :key="String(val)"
                        class="pivot-popover-item"
                      >
                        <n-checkbox
                          :checked="isFilterValueChecked(name, val)"
                          @update:checked="() => toggleFilterValue(name, val)"
                        >
                          {{ val }}
                        </n-checkbox>
                      </div>
                    </div>
                  </div>
                </n-popover>
                <button
                  type="button"
                  class="chip-remove"
                  @click.stop="removeFromArea('filters', name)"
                >
                  ×
                </button>
              </div>
              <div v-if="!filtersArea.length" class="pivot-placeholder">
                Drop fields here
              </div>
            </div>
          </div>
          
          <div class="pivot-area">
            <div class="pivot-area-title">Legend (Series)</div>
            <div
              class="pivot-drop-zone"
              @dragover.prevent
              @drop="onDropToArea('legend')"
            >
              <div
                v-for="(name, index) in legendArea"
                :key="name"
                class="pivot-chip"
                draggable="true"
                @dragstart="onFieldDragStart(name, 'legend')"
              >
                <n-popover
                  placement="left"
                  trigger="click"
                >
                  <template #trigger>
                    <button type="button" class="chip-trigger">
                      <span class="chip-label">{{ name }}</span>
                      <span class="chip-dropdown-arrow">▼</span>
                    </button>
                  </template>
                  <div class="pivot-popover">
                    <template v-if="index === 0 && dataStore.legendField">
                      <div class="pivot-popover-header">
                        <span class="popover-title">{{ dataStore.legendField }}</span>
                        <button
                          v-if="hasLegendFilter"
                          type="button"
                          class="popover-action"
                          @click.stop="clearLegendSelections()"
                        >
                          Clear filter
                        </button>
                      </div>
                      <div class="pivot-popover-search">
                        <n-input
                          v-model:value="legendSearch"
                          size="tiny"
                          placeholder="Search..."
                          clearable
                        />
                      </div>
                      <div class="pivot-popover-selectall">
                        <n-checkbox
                          :checked="isAllLegendVisibleSelected"
                          @update:checked="toggleLegendSelectAll"
                        >
                          (Select All)
                        </n-checkbox>
                      </div>
                      <div class="pivot-popover-list">
                        <div
                          v-for="cat in visibleLegendCategories"
                          :key="cat"
                          class="pivot-popover-item"
                        >
                          <n-checkbox
                            :checked="isLegendCategoryChecked(cat)"
                            @update:checked="checked => updateLegendCheckbox(cat, checked)"
                          >
                            {{ cat }}
                          </n-checkbox>
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <div class="pivot-popover-header">
                        <span class="popover-title">{{ name }}</span>
                      </div>
                      <div class="pivot-popover-body">
                        <div class="popover-hint">
                          Only the top legend field controls the map legend. Additional legend fields are reserved for charts.
                        </div>
                      </div>
                    </template>
                  </div>
                </n-popover>
                <button
                  type="button"
                  class="chip-remove"
                  @click.stop="removeFromArea('legend', name)"
                >
                  ×
                </button>
              </div>
              <div v-if="!legendArea.length" class="pivot-placeholder">
                Drop fields here (first field controls map legend)
              </div>
            </div>
          </div>
          
          <div class="pivot-area">
            <div class="pivot-area-title">Axis (Categories)</div>
            <div
              class="pivot-drop-zone"
              @dragover.prevent
              @drop="onDropToArea('axis')"
            >
              <div
                v-for="name in axisArea"
                :key="name"
                class="pivot-chip"
                draggable="true"
                @dragstart="onFieldDragStart(name, 'axis')"
              >
                <n-popover placement="left" trigger="click">
                  <template #trigger>
                    <button type="button" class="chip-trigger">
                      <span class="chip-label">{{ name }}</span>
                      <span class="chip-dropdown-arrow">▼</span>
                    </button>
                  </template>
                  <div class="pivot-popover">
                    <div class="pivot-popover-header">
                      <span class="popover-title">{{ name }}</span>
                      <button
                        v-if="hasFilterSelections(name)"
                        type="button"
                        class="popover-action"
                        @click.stop="clearFilterFieldSelections(name)"
                      >
                        Clear filter
                      </button>
                    </div>
                    <div class="pivot-popover-search">
                      <n-input
                        :value="getFilterSearch(name)"
                        size="tiny"
                        placeholder="Search..."
                        clearable
                        @update:value="val => updateFilterSearch(name, val)"
                      />
                    </div>
                    <div class="pivot-popover-selectall">
                      <n-checkbox
                        :checked="isFilterAllSelected(name)"
                        @update:checked="checked => toggleFilterSelectAll(name, checked)"
                      >
                        (Select All)
                      </n-checkbox>
                    </div>
                    <div class="pivot-popover-list">
                      <div
                        v-for="val in getFilterVisibleValues(name)"
                        :key="String(val)"
                        class="pivot-popover-item"
                      >
                        <n-checkbox
                          :checked="isFilterValueChecked(name, val)"
                          @update:checked="() => toggleFilterValue(name, val)"
                        >
                          {{ val }}
                        </n-checkbox>
                      </div>
                    </div>
                  </div>
                </n-popover>
                <button
                  type="button"
                  class="chip-remove"
                  @click.stop="removeFromArea('axis', name)"
                >
                  ×
                </button>
              </div>
              <div v-if="!axisArea.length" class="pivot-placeholder">
                Drop fields here to control labels and grouping
              </div>
            </div>
          </div>
          
          <div class="pivot-area">
            <div class="pivot-area-title">Σ Values</div>
            <div
              class="pivot-drop-zone"
              @dragover.prevent
              @drop="onDropToArea('values')"
            >
              <div
                v-for="name in valuesArea"
                :key="name"
                class="pivot-chip value-chip"
                draggable="true"
                @dragstart="onFieldDragStart(name, 'values')"
              >
                <span class="chip-label">{{ name }}</span>
                <n-select
                  v-model:value="valueAggMap[name]"
                  :options="getAggOptions(name)"
                  size="tiny"
                  class="agg-select"
                  @update:value="onAggChange(name, $event)"
                />
                <button
                  type="button"
                  class="chip-remove"
                  @click.stop="removeFromArea('values', name)"
                >
                  ×
                </button>
              </div>
              <div v-if="!valuesArea.length" class="pivot-placeholder">
                Drop fields here for metrics and counts
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { NIcon, NInput, NSelect, NCheckbox, NPopover } from 'naive-ui'
import { Layers as LayersIcon } from '@vicons/ionicons5'
import { useDataStore } from '@/store/dataStore'

const dataStore = useDataStore()

// Field list and pivot areas
const fieldSearch = ref('')

const filtersArea = ref([])
const legendArea = ref([])
const axisArea = ref([])
const valuesArea = ref([])
const valueAggMap = ref({}) // field -> 'sum' | 'avg' | 'count'

const filterSearchMap = ref({})
const legendSearch = ref('')

// Drag state
const dragFieldName = ref(null)
const dragSourceArea = ref(null) // 'list' | 'filters' | 'legend' | 'axis' | 'values'

// All dataset fields with metric info
const allFieldDefs = computed(() => {
  if (!dataStore.dataset || dataStore.dataset.length === 0) return []
  const sample = dataStore.dataset[0]
  const keys = Object.keys(sample)
  const metricSet = new Set(dataStore.availableMetrics || [])
  return keys.map(name => ({
    name,
    isMetric: metricSet.has(name)
  }))
})

const visibleFields = computed(() => {
  const q = fieldSearch.value.trim().toLowerCase()
  if (!q) return allFieldDefs.value
  return allFieldDefs.value.filter(f =>
    String(f.name).toLowerCase().includes(q)
  )
})

const isFieldUsed = (name) => {
  const n = String(name)
  return (
    filtersArea.value.includes(n) ||
    legendArea.value.includes(n) ||
    axisArea.value.includes(n) ||
    valuesArea.value.includes(n)
  )
}

const onFieldDragStart = (name, source) => {
  dragFieldName.value = name
  dragSourceArea.value = source
}

const removeFromAreaLocal = (area, name) => {
  const n = String(name)
  if (area === 'filters') {
    filtersArea.value = filtersArea.value.filter(v => v !== n)
  } else if (area === 'legend') {
    legendArea.value = legendArea.value.filter(v => v !== n)
  } else if (area === 'axis') {
    axisArea.value = axisArea.value.filter(v => v !== n)
  } else if (area === 'values') {
    valuesArea.value = valuesArea.value.filter(v => v !== n)
    const map = { ...valueAggMap.value }
    delete map[n]
    valueAggMap.value = map
  }
}

const removeFromArea = (area, name) => {
  removeFromAreaLocal(area, name)
  syncAreasToStore()
}

const onDropToArea = (area) => {
  if (!dragFieldName.value) return
  const name = dragFieldName.value
  const source = dragSourceArea.value

  if (source && source !== 'list') {
    removeFromAreaLocal(source, name)
  }

  const n = String(name)
  if (area === 'filters') {
    if (!filtersArea.value.includes(n)) {
      filtersArea.value = [...filtersArea.value, n]
    }
  } else if (area === 'legend') {
    if (!legendArea.value.includes(n)) {
      legendArea.value = [...legendArea.value, n]
    }
  } else if (area === 'axis') {
    if (!axisArea.value.includes(n)) {
      axisArea.value = [...axisArea.value, n]
    }
  } else if (area === 'values') {
    if (!valuesArea.value.includes(n)) {
      valuesArea.value = [...valuesArea.value, n]
    }
    const metricSet = new Set(dataStore.availableMetrics || [])
    const map = { ...valueAggMap.value }
    if (!map[n]) {
      map[n] = metricSet.has(n) ? 'sum' : 'count'
    }
    valueAggMap.value = map
  }

  dragFieldName.value = null
  dragSourceArea.value = null
  syncAreasToStore()
}

// Aggregation options for Values area
const aggOptionsNumeric = [
  { label: 'Sum', value: 'sum' },
  { label: 'Average', value: 'avg' },
  { label: 'Count', value: 'count' }
]

const aggOptionsCountOnly = [
  { label: 'Count', value: 'count' }
]

const getAggOptions = (fieldName) => {
  const metricSet = new Set(dataStore.availableMetrics || [])
  return metricSet.has(fieldName) ? aggOptionsNumeric : aggOptionsCountOnly
}

const onAggChange = (name, agg) => {
  const n = String(name)
  const map = { ...valueAggMap.value, [n]: agg }
  valueAggMap.value = map
  syncAreasToStore()
}

// Helpers for Filters popover
const getFilterValuesForField = (field) => {
  const key = String(field)
  const rows = dataStore.dataset || []
  const seen = new Set()
  const values = []
  for (const row of rows) {
    const raw = row[key]
    if (raw === null || raw === undefined || raw === '') continue
    const str = String(raw)
    if (!seen.has(str)) {
      seen.add(str)
      values.push(raw)
    }
  }
  return values
}

const getFilterSearch = (field) => {
  const key = String(field)
  return filterSearchMap.value[key] || ''
}

const updateFilterSearch = (field, value) => {
  const key = String(field)
  filterSearchMap.value = {
    ...filterSearchMap.value,
    [key]: value || ''
  }
}

const getFilterVisibleValues = (field) => {
  const all = getFilterValuesForField(field)
  const q = getFilterSearch(field).trim().toLowerCase()
  if (!q) return all
  return all.filter(val =>
    String(val).toLowerCase().includes(q)
  )
}

const hasFilterSelections = (field) => {
  const key = String(field)
  const sel = dataStore.filterSelections && dataStore.filterSelections[key]
  return Array.isArray(sel)
}

const isFilterAllSelected = (field) => {
  const all = getFilterValuesForField(field).map(v => String(v))
  const key = String(field)
  const raw = dataStore.filterSelections && dataStore.filterSelections[key]
  if (!Array.isArray(raw)) return true // no explicit filter -> all selected
  const sel = raw.map(v => String(v))
  if (sel.length === 0) return false
  if (sel.length !== all.length) return false
  const set = new Set(sel)
  return all.every(v => set.has(v))
}

const isFilterValueChecked = (field, value) => {
  const key = String(field)
  const raw = dataStore.filterSelections && dataStore.filterSelections[key]
  if (!Array.isArray(raw)) return true
  const sel = raw.map(v => String(v))
  if (sel.length === 0) return false
  const target = String(value)
  return sel.includes(target)
}

const toggleFilterSelectAll = (field, checked) => {
  const key = String(field)
  if (checked) {
    // Select all -> no explicit filter for this field
    dataStore.setFilterSelectionsForField(key, null)
  } else {
    // Deselect all -> explicit empty selection (no values allowed)
    dataStore.setFilterSelectionsForField(key, [])
  }
}

const toggleFilterValue = (field, value) => {
  const key = String(field)
  const all = getFilterValuesForField(field).map(v => String(v))
  const raw = dataStore.filterSelections && dataStore.filterSelections[key]
  let current = Array.isArray(raw) ? raw.map(v => String(v)) : all.slice()
  const target = String(value)
  const set = new Set(current)
  if (set.has(target)) {
    set.delete(target)
  } else {
    set.add(target)
  }
  const next = Array.from(set)
  if (next.length === all.length) {
    dataStore.setFilterSelectionsForField(key, null)
  } else {
    dataStore.setFilterSelectionsForField(key, next)
  }
}

const clearFilterFieldSelections = (field) => {
  dataStore.clearFilterSelections(field)
}

// Helpers for Legend popover (active legend field is the first item in legendArea)
const allLegendCategories = computed(() => dataStore.legendCategories || [])

const visibleLegendCategories = computed(() => {
  const q = legendSearch.value.trim().toLowerCase()
  if (!q) return allLegendCategories.value
  return allLegendCategories.value.filter(name =>
    String(name).toLowerCase().includes(q)
  )
})

const hasLegendFilter = computed(() => {
  return Array.isArray(dataStore.legendSelected) &&
    dataStore.legendSelected.length > 0
})

const isLegendCategoryChecked = (name) => {
  // null = all categories selected
  if (!Array.isArray(dataStore.legendSelected)) {
    return true
  }
  const selected = dataStore.legendSelected.map(String)
  if (selected.length === 0) return false
  return selected.includes(String(name))
}

const isAllLegendVisibleSelected = computed(() => {
  // Treat null (no explicit filter) as all selected
  if (!Array.isArray(dataStore.legendSelected)) return true
  const selected = dataStore.legendSelected.map(String)
  const all = allLegendCategories.value.map(v => String(v))
  if (selected.length === 0) return false
  if (selected.length !== all.length) return false
  const set = new Set(selected)
  return all.every(v => set.has(v))
})

const updateLegendCheckbox = (name, checked) => {
  const all = allLegendCategories.value.map(v => String(v))
  const key = String(name)

  // Start from current selection; null means all categories currently selected
  let current = Array.isArray(dataStore.legendSelected)
    ? dataStore.legendSelected.map(v => String(v))
    : all.slice()

  if (checked) {
    if (!current.includes(key)) {
      current.push(key)
    }
  } else {
    current = current.filter(v => v !== key)
  }

  // If we ended up with all categories explicitly selected, collapse back to null (no filter)
  if (current.length === all.length) {
    dataStore.setLegendSelections(null)
  } else {
    dataStore.setLegendSelections(current)
  }
}

const toggleLegendSelectAll = (checked) => {
  if (checked) {
    // Select all -> no explicit filter
    dataStore.setLegendSelections(null)
  } else {
    // Deselect all
    dataStore.setLegendSelections([])
  }
}

const clearLegendSelections = () => {
  dataStore.clearLegendSelections()
}

// Sync UI areas to store
const syncAreasToStore = () => {
  // Filters
  dataStore.setFilterDimensions(filtersArea.value)

  // Legend (single field)
  const legendField = legendArea.value[0] || null
  dataStore.setLegendField(legendField)

  // Axis
  dataStore.setAxisFields(axisArea.value)

  // Values
  const metricSet = new Set(dataStore.availableMetrics || [])
  const defs = valuesArea.value.map(field => {
    const n = String(field)
    let agg = valueAggMap.value[n]
    if (agg !== 'avg' && agg !== 'count') {
      agg = metricSet.has(n) ? 'sum' : 'count'
    }
    return { field: n, agg }
  })
  dataStore.setValueFields(defs)
}

// Initialize areas from store
const initFromStore = () => {
  filtersArea.value = Array.isArray(dataStore.filterDimensions)
    ? dataStore.filterDimensions.slice()
    : []

  legendArea.value = dataStore.legendField ? [dataStore.legendField] : []

  axisArea.value = Array.isArray(dataStore.axisFields)
    ? dataStore.axisFields.slice()
    : []

  valuesArea.value = []
  valueAggMap.value = {}
  if (Array.isArray(dataStore.valueFields)) {
    const map = {}
    const arr = []
    dataStore.valueFields.forEach(def => {
      if (!def || !def.field) return
      const n = String(def.field)
      arr.push(n)
      map[n] = def.agg || 'sum'
    })
    valuesArea.value = arr
    valueAggMap.value = map
  }
}

initFromStore()

// Reset local state when dataset is cleared
watch(
  () => dataStore.dataset,
  (newDataset) => {
    if (!newDataset || newDataset.length === 0) {
      fieldSearch.value = ''
      filtersArea.value = []
      legendArea.value = []
      axisArea.value = []
      valuesArea.value = []
      valueAggMap.value = {}
      filterSearchMap.value = {}
      legendSearch.value = ''
    }
  }
)
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
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
  overflow: hidden;
}

.fields-section {
  margin-bottom: 12px;
}

.fields-section:last-child {
  margin-bottom: 0;
}

.pivot-section {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 12px;
}

.fields-list-container {
  margin-top: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #f9fafb;
  max-height: 160px;
  overflow-y: auto;
}

.fields-list {
  display: flex;
  flex-direction: column;
}

.field-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  font-size: 11px;
  cursor: move;
}

.field-item:nth-child(odd) {
  background: #f9fafb;
}

.field-item:nth-child(even) {
  background: #f3f4f6;
}

.drag-handle {
  color: #999;
}

.field-name {
  flex: 1;
  font-size: 11px;
  color: #111827;
}

.metric-badge {
  font-size: 10px;
  color: #4b5563;
}

.pivot-fields-top {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pivot-fields-title {
  font-size: 11px;
  color: #4b5563;
}

.pivot-separator {
  margin: 10px 0;
  border-top: 1px dashed #d4d4d8;
}

.pivot-areas-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 8px;
}

.pivot-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pivot-area-title {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
}

.pivot-drop-zone {
  min-height: 52px;
  padding: 4px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

.pivot-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  margin-bottom: 2px;
  border-radius: 3px;
  background: #e5e7eb;
  font-size: 11px;
}

.value-chip {
  gap: 4px;
}

.chip-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  width: 100%;
  padding: 2px 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.chip-trigger:hover {
  background: #d4d4d8;
}

.chip-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-dropdown-arrow {
  font-size: 10px;
  color: #4b5563;
  flex-shrink: 0;
}

.chip-remove {
  border: none;
  background: transparent;
  font-size: 10px;
  cursor: pointer;
  padding: 0 2px;
}

.agg-select :deep(.n-base-selection) {
  font-size: 10px;
}

.pivot-placeholder {
  font-size: 10px;
  color: #9ca3af;
}

.pivot-popover {
  max-height: 260px;
  display: flex;
  flex-direction: column;
  padding: 4px 2px;
}

.pivot-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.pivot-popover-search {
  margin-bottom: 4px;
}

.pivot-popover-selectall {
  margin-bottom: 4px;
}

.pivot-popover-list {
  max-height: 180px;
  overflow-y: auto;
}

.pivot-popover-item {
  font-size: 11px;
}

.pivot-popover-body {
  font-size: 11px;
}

.popover-hint {
  font-size: 11px;
  color: #6b7280;
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
