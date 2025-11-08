<template>
  <div class="filter-bar">
    <div class="filter-bar-header">
      <n-button 
        size="small" 
        @click="showAddFilterModal = true"
        type="primary"
        ghost
      >
        <template #icon>
          <n-icon :component="AddIcon" />
        </template>
        Add filter
      </n-button>
      
      <n-button 
        v-if="activeFilters.length > 0"
        size="small" 
        text
        @click="resetAllFilters"
      >
        <template #icon>
          <n-icon :component="RefreshIcon" />
        </template>
        Reset
      </n-button>
    </div>
    
    <div class="active-filters" v-if="activeFilters.length > 0">
      <div 
        v-for="filter in activeFilters" 
        :key="filter.id"
        class="filter-chip"
      >
        <div class="filter-info">
          <span class="filter-field">{{ filter.field }}</span>
          <span class="filter-operator">{{ getOperatorLabel(filter.operator) }}</span>
          <span class="filter-value">{{ formatFilterValue(filter.value) }}</span>
        </div>
        <n-button 
          text 
          size="tiny"
          @click="editFilter(filter)"
          class="filter-action"
        >
          <n-icon :component="CreateIcon" size="14" />
        </n-button>
        <n-button 
          text 
          size="tiny"
          @click="removeFilter(filter.id)"
          class="filter-action"
        >
          <n-icon :component="CloseIcon" size="14" />
        </n-button>
      </div>
    </div>
    
    <!-- Add/Edit Filter Modal -->
    <n-modal
      v-model:show="showAddFilterModal"
      preset="card"
      title="Add filter"
      style="width: 500px;"
      :bordered="false"
    >
      <n-form>
        <n-form-item label="Field">
          <n-select
            v-model:value="currentFilter.field"
            :options="availableFieldOptions"
            placeholder="Select field"
            @update:value="handleFieldChange"
          />
        </n-form-item>
        
        <n-form-item label="Condition">
          <n-select
            v-model:value="currentFilter.operator"
            :options="operatorOptions"
            placeholder="Select condition"
          />
        </n-form-item>
        
        <n-form-item label="Value">
          <n-select
            v-if="currentFilter.field && isFieldCategorical(currentFilter.field)"
            v-model:value="currentFilter.value"
            :options="getFieldValues(currentFilter.field)"
            placeholder="Select value"
            multiple
            filterable
          />
          <n-input
            v-else
            v-model:value="currentFilter.value"
            placeholder="Enter value"
          />
        </n-form-item>
      </n-form>
      
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <n-button @click="showAddFilterModal = false">Cancel</n-button>
          <n-button type="primary" @click="applyFilter">Apply</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { NButton, NIcon, NModal, NForm, NFormItem, NSelect, NInput } from 'naive-ui'
import { Add as AddIcon, Close as CloseIcon, Create as CreateIcon, Refresh as RefreshIcon } from '@vicons/ionicons5'
import { useDataStore } from '@/store/dataStore'

const dataStore = useDataStore()

const showAddFilterModal = ref(false)
const activeFilters = ref([])
const currentFilter = ref({
  id: null,
  field: null,
  operator: 'equals',
  value: null
})

const availableFieldOptions = computed(() => {
  if (!dataStore.dataset || dataStore.dataset.length === 0) return []
  
  const firstRow = dataStore.dataset[0]
  return Object.keys(firstRow).map(key => ({
    label: key,
    value: key
  }))
})

const operatorOptions = [
  { label: 'equals', value: 'equals' },
  { label: 'not equals', value: 'not_equals' },
  { label: 'contains', value: 'contains' },
  { label: 'does not contain', value: 'not_contains' },
  { label: 'greater than', value: 'greater_than' },
  { label: 'less than', value: 'less_than' },
  { label: 'is empty', value: 'is_empty' },
  { label: 'is not empty', value: 'is_not_empty' }
]

const isFieldCategorical = (field) => {
  if (!field || !dataStore.dataset || dataStore.dataset.length === 0) return false
  
  const uniqueValues = new Set(dataStore.dataset.map(row => row[field]))
  return uniqueValues.size < 50 // Consider categorical if less than 50 unique values
}

const getFieldValues = (field) => {
  if (!field || !dataStore.dataset) return []
  
  const uniqueValues = [...new Set(dataStore.dataset.map(row => row[field]))]
  return uniqueValues
    .filter(v => v !== null && v !== undefined && v !== '')
    .map(value => ({
      label: String(value),
      value: String(value)
    }))
}

const handleFieldChange = (field) => {
  currentFilter.value.value = null
}

const applyFilter = () => {
  if (!currentFilter.value.field) return
  
  if (currentFilter.value.id) {
    // Update existing filter
    const index = activeFilters.value.findIndex(f => f.id === currentFilter.value.id)
    if (index !== -1) {
      activeFilters.value[index] = { ...currentFilter.value }
    }
  } else {
    // Add new filter
    activeFilters.value.push({
      ...currentFilter.value,
      id: Date.now()
    })
  }
  
  applyFiltersToStore()
  showAddFilterModal.value = false
  resetCurrentFilter()
}

const editFilter = (filter) => {
  currentFilter.value = { ...filter }
  showAddFilterModal.value = true
}

const removeFilter = (id) => {
  activeFilters.value = activeFilters.value.filter(f => f.id !== id)
  applyFiltersToStore()
}

const resetAllFilters = () => {
  activeFilters.value = []
  dataStore.setFilter('region', null)
  dataStore.setFilter('province', null)
  dataStore.setFilter('city', null)
}

const resetCurrentFilter = () => {
  currentFilter.value = {
    id: null,
    field: null,
    operator: 'equals',
    value: null
  }
}

const applyFiltersToStore = () => {
  // Apply filters to the data store
  const regionFilter = activeFilters.value.find(f => f.field === 'region')
  const provinceFilter = activeFilters.value.find(f => f.field === 'province')
  const cityFilter = activeFilters.value.find(f => f.field === 'city')
  
  if (regionFilter && regionFilter.value) {
    const value = Array.isArray(regionFilter.value) ? regionFilter.value[0] : regionFilter.value
    dataStore.setFilter('region', value)
  } else {
    dataStore.setFilter('region', null)
  }
  
  if (provinceFilter && provinceFilter.value) {
    const value = Array.isArray(provinceFilter.value) ? provinceFilter.value[0] : provinceFilter.value
    dataStore.setFilter('province', value)
  } else {
    dataStore.setFilter('province', null)
  }
  
  if (cityFilter && cityFilter.value) {
    const value = Array.isArray(cityFilter.value) ? cityFilter.value[0] : cityFilter.value
    dataStore.setFilter('city', value)
  } else {
    dataStore.setFilter('city', null)
  }
}

const getOperatorLabel = (operator) => {
  const option = operatorOptions.find(o => o.value === operator)
  return option ? option.label : operator
}

const formatFilterValue = (value) => {
  if (Array.isArray(value)) {
    return value.length > 2 
      ? `${value.slice(0, 2).join(', ')} +${value.length - 2} more`
      : value.join(', ')
  }
  return String(value)
}
</script>

<style scoped>
.filter-bar {
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
}

.filter-bar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #f0f2ff;
  border: 1px solid #667eea;
  border-radius: 16px;
  font-size: 13px;
}

.filter-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-field {
  font-weight: 600;
  color: #667eea;
}

.filter-operator {
  color: #666;
  font-size: 12px;
}

.filter-value {
  color: #333;
  font-weight: 500;
}

.filter-action {
  padding: 2px;
  color: #666;
}

.filter-action:hover {
  color: #667eea;
}
</style>
