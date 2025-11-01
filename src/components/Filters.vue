<template>
  <div class="filters">
    <n-card title="Filters" size="small">
      <n-space vertical>
        <!-- Metric Selection -->
        <div class="filter-group">
          <n-text strong>Metric</n-text>
          <n-select
            v-model:value="selectedMetric"
            :options="metricOptions"
            placeholder="Select metric"
            clearable
            @update:value="handleMetricChange"
          />
        </div>
        
        <!-- Region Filter -->
        <div class="filter-group">
          <n-text strong>Region</n-text>
          <n-select
            v-model:value="regionFilter"
            :options="regionOptions"
            placeholder="All regions"
            clearable
            @update:value="handleRegionChange"
          />
        </div>
        
        <!-- Province Filter -->
        <div class="filter-group">
          <n-text strong>Province</n-text>
          <n-select
            v-model:value="provinceFilter"
            :options="provinceOptions"
            placeholder="All provinces"
            clearable
            :disabled="!regionFilter"
            @update:value="handleProvinceChange"
          />
        </div>
        
        <!-- City Filter -->
        <div class="filter-group">
          <n-text strong>City</n-text>
          <n-select
            v-model:value="cityFilter"
            :options="cityOptions"
            placeholder="All cities"
            clearable
            :disabled="!provinceFilter"
            @update:value="handleCityChange"
          />
        </div>
        
        <!-- Clear Button -->
        <n-button 
          type="warning" 
          block 
          @click="clearAllFilters"
          :disabled="!hasActiveFilters"
        >
          Clear All Filters
        </n-button>
        
        <!-- Filter Summary -->
        <n-text depth="3" style="font-size: 12px;">
          Showing {{ dataStore.filteredData.length }} of {{ dataStore.dataset.length }} records
        </n-text>
      </n-space>
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { NCard, NSpace, NSelect, NButton, NText } from 'naive-ui'
import { useDataStore } from '@/store/dataStore'

const dataStore = useDataStore()

const selectedMetric = ref(null)
const regionFilter = ref(null)
const provinceFilter = ref(null)
const cityFilter = ref(null)

// Computed options
const metricOptions = computed(() => {
  return dataStore.availableMetrics.map(metric => ({
    label: metric,
    value: metric
  }))
})

const regionOptions = computed(() => {
  return dataStore.regions.map(region => ({
    label: region,
    value: region
  }))
})

const provinceOptions = computed(() => {
  return dataStore.provinces.map(province => ({
    label: province,
    value: province
  }))
})

const cityOptions = computed(() => {
  return dataStore.cities.map(city => ({
    label: city,
    value: city
  }))
})

const hasActiveFilters = computed(() => {
  return regionFilter.value || provinceFilter.value || cityFilter.value
})

// Handlers
function handleMetricChange(value) {
  dataStore.setSelectedMetric(value)
}

function handleRegionChange(value) {
  dataStore.setFilter('region', value)
  provinceFilter.value = null
  cityFilter.value = null
}

function handleProvinceChange(value) {
  dataStore.setFilter('province', value)
  cityFilter.value = null
}

function handleCityChange(value) {
  dataStore.setFilter('city', value)
}

function clearAllFilters() {
  regionFilter.value = null
  provinceFilter.value = null
  cityFilter.value = null
  dataStore.clearFilters()
}

// Sync with store
watch(() => dataStore.selectedMetric, (value) => {
  selectedMetric.value = value
})
</script>

<style scoped>
.filters {
  margin-bottom: 16px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
