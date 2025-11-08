<template>
  <div class="location-breakdown">
    <n-card size="small">
      <template #header>
        <div class="card-header">
          <span>Geographic Location Breakdown</span>
          <n-button
            text
            size="small"
            @click="collapsed = !collapsed"
          >
            <n-icon :component="collapsed ? ChevronDownIcon : ChevronUpIcon" size="20" />
          </n-button>
        </div>
      </template>
      <div v-show="!collapsed">
      <n-space vertical :size="16">
        <!-- Filter by category if breakdowns exist -->
        <div v-if="hasBreakdowns" class="category-selector">
          <n-text strong>Filter by Category:</n-text>
          <n-select
            v-model:value="selectedCategory"
            :options="categoryOptions"
            placeholder="All categories"
            clearable
            size="small"
          />
        </div>

        <!-- No data state -->
        <div v-if="!dataStore.selectedMetric" class="no-data">
          <n-empty description="Select a metric to view location breakdown" size="small" />
        </div>

        <div v-else-if="locationBreakdowns.length === 0" class="no-data">
          <n-empty description="No data available" size="small" />
        </div>

        <!-- Location breakdowns with callouts -->
        <div v-else class="breakdowns-container">
          <div
            v-for="location in locationBreakdowns"
            :key="location.name"
            class="location-group"
          >
            <!-- Location header with total -->
            <div class="location-header">
              <div class="location-info">
                <n-icon :component="LocationIcon" size="18" color="#667eea" />
                <n-text strong>{{ location.name }}</n-text>
                <n-tag size="small" :type="getTagType(location.percentage)">
                  {{ location.total.toLocaleString() }}
                </n-tag>
              </div>
              <n-button
                text
                size="small"
                @click="toggleLocation(location.name)"
              >
                <n-icon :component="location.expanded ? ChevronUpIcon : ChevronDownIcon" />
              </n-button>
            </div>

            <!-- Subdivisions (cities/municipalities) -->
            <div v-if="location.expanded" class="subdivisions">
              <div
                v-for="(sub, index) in location.subdivisions"
                :key="sub.name"
                class="subdivision-item"
              >
                <div class="subdivision-callout">
                  <div class="callout-line"></div>
                  <div class="callout-dot"></div>
                </div>
                <div class="subdivision-content">
                  <span class="subdivision-name">{{ sub.name }}</span>
                  <span class="subdivision-value">{{ sub.value.toLocaleString() }}</span>
                </div>
              </div>

              <!-- Horizontal bar chart for this location -->
              <div class="location-chart">
                <div
                  v-for="sub in location.subdivisions.slice(0, 10)"
                  :key="sub.name"
                  class="chart-bar"
                >
                  <span class="bar-label">{{ sub.name }}</span>
                  <div class="bar-container">
                    <div
                      class="bar-fill"
                      :style="{
                        width: (sub.value / location.maxSubValue * 100) + '%',
                        backgroundColor: getBarColor(sub.value, location.maxSubValue)
                      }"
                    ></div>
                    <span class="bar-value">{{ sub.value.toLocaleString() }}</span>
                  </div>
                </div>
              </div>

              <!-- Others summary if more than 10 -->
              <div v-if="location.subdivisions.length > 10" class="others-summary">
                <n-text depth="3">
                  Others: {{ location.othersCount }} ({{ location.othersValue.toLocaleString() }})
                </n-text>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <n-divider v-if="locationBreakdowns.length > 0" />
        <div v-if="locationBreakdowns.length > 0" class="summary">
          <n-statistic label="Total Locations" :value="locationBreakdowns.length" />
          <n-statistic label="Total Value" :value="totalValue.toLocaleString()" />
        </div>
      </n-space>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { NCard, NSpace, NEmpty, NTag, NIcon, NText, NButton, NSelect, NDivider, NStatistic } from 'naive-ui'
import { LocationOutline as LocationIcon, ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon } from '@vicons/ionicons5'
import { useDataStore } from '@/store/dataStore'

const dataStore = useDataStore()
const selectedCategory = ref(null)
const collapsed = ref(false)
const expandedLocations = ref(new Set())

// Compute location breakdowns with subdivisions
const locationBreakdowns = computed(() => {
  if (!dataStore.filteredData || dataStore.filteredData.length === 0) return []
  if (!dataStore.selectedMetric) return []

  // Group by parent location (region or province)
  const locationGroups = {}
  
  dataStore.filteredData.forEach(row => {
    // Determine parent and child based on map level
    let parent, child
    
    if (dataStore.mapLevel === 'cities' || dataStore.filters.province) {
      parent = row.province
      child = row.city
    } else if (dataStore.mapLevel === 'provinces' || dataStore.filters.region) {
      parent = row.region
      child = row.province
    } else {
      parent = row.region
      child = row.province
    }

    if (!parent || !child) return

    // Filter by selected category if applicable
    if (selectedCategory.value && row.gender && row.gender !== selectedCategory.value) {
      return
    }

    if (!locationGroups[parent]) {
      locationGroups[parent] = {
        name: parent,
        total: 0,
        subdivisions: {}
      }
    }

    const value = parseFloat(row[dataStore.selectedMetric])
    if (!isNaN(value)) {
      locationGroups[parent].total += value
      
      if (!locationGroups[parent].subdivisions[child]) {
        locationGroups[parent].subdivisions[child] = 0
      }
      locationGroups[parent].subdivisions[child] += value
    }
  })

  // Convert to array and process
  const totalSum = Object.values(locationGroups).reduce((sum, group) => sum + group.total, 0)
  
  return Object.values(locationGroups).map(group => {
    const subdivisions = Object.entries(group.subdivisions)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    
    const maxSubValue = Math.max(...subdivisions.map(s => s.value))
    const top10 = subdivisions.slice(0, 10)
    const others = subdivisions.slice(10)
    const othersValue = others.reduce((sum, sub) => sum + sub.value, 0)

    return {
      name: group.name,
      total: group.total,
      percentage: totalSum > 0 ? ((group.total / totalSum) * 100).toFixed(1) : 0,
      subdivisions,
      maxSubValue,
      othersCount: others.length,
      othersValue,
      expanded: expandedLocations.value.has(group.name)
    }
  }).sort((a, b) => b.total - a.total)
})

// Check if data has breakdown columns
const hasBreakdowns = computed(() => {
  if (!dataStore.filteredData || dataStore.filteredData.length === 0) return false
  const firstRow = dataStore.filteredData[0]
  return firstRow.gender !== undefined || firstRow.age_group !== undefined
})

// Get category options
const categoryOptions = computed(() => {
  if (!hasBreakdowns.value) return []
  
  const categories = new Set()
  dataStore.filteredData.forEach(row => {
    if (row.gender) categories.add(row.gender)
  })
  
  return Array.from(categories).map(cat => ({
    label: cat,
    value: cat
  }))
})

// Calculate total value
const totalValue = computed(() => {
  return locationBreakdowns.value.reduce((sum, loc) => sum + loc.total, 0)
})

// Get tag type based on percentage
function getTagType(percentage) {
  const p = parseFloat(percentage)
  if (p >= 20) return 'success'
  if (p >= 10) return 'info'
  if (p >= 5) return 'warning'
  return 'default'
}

// Get bar color based on value
function getBarColor(value, maxValue) {
  const percentage = (value / maxValue) * 100
  if (percentage >= 80) return '#18a058'
  if (percentage >= 60) return '#2080f0'
  if (percentage >= 40) return '#f0a020'
  if (percentage >= 20) return '#d03050'
  return '#909399'
}

// Toggle location expansion
function toggleLocation(name) {
  if (expandedLocations.value.has(name)) {
    expandedLocations.value.delete(name)
  } else {
    expandedLocations.value.add(name)
  }
}
</script>

<style scoped>
.location-breakdown {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.location-breakdown :deep(.n-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.location-breakdown :deep(.n-card__content) {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.category-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.no-data {
  padding: 20px;
  text-align: center;
}

.breakdowns-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.location-group {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  background: #ffffff;
  transition: all 0.3s ease;
}

.location-group:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
}

.location-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.location-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subdivisions {
  margin-top: 12px;
  padding-left: 8px;
}

.subdivision-item {
  display: flex;
  align-items: center;
  padding: 4px 0;
  position: relative;
}

.subdivision-callout {
  position: relative;
  width: 40px;
  height: 20px;
  margin-right: 8px;
}

.callout-line {
  position: absolute;
  left: 0;
  top: 10px;
  width: 30px;
  height: 1px;
  background: #d0d0d0;
  border-top: 1px dashed #999;
}

.callout-dot {
  position: absolute;
  right: 0;
  top: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #667eea;
}

.subdivision-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
  font-size: 13px;
}

.subdivision-name {
  color: #666;
}

.subdivision-value {
  font-weight: 600;
  color: #333;
}

.location-chart {
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.chart-bar {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.bar-label {
  width: 150px;
  flex-shrink: 0;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-container {
  flex: 1;
  display: flex;
  align-items: center;
  position: relative;
  height: 24px;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
  min-width: 2px;
}

.bar-value {
  position: absolute;
  right: 8px;
  font-weight: 600;
  color: #333;
  font-size: 11px;
}

.others-summary {
  margin-top: 12px;
  padding: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  text-align: center;
}

.summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

/* Scrollbar styling */
.location-breakdown::-webkit-scrollbar {
  width: 6px;
}

.location-breakdown::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.location-breakdown::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.location-breakdown::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
