<template>
  <div class="location-stats">
    <n-card title="Geographic Location Statistics" size="small">
      <n-space vertical :size="16">
        <!-- Show stats only when data is loaded and metric is selected -->
        <div v-if="!dataStore.selectedMetric" class="no-data">
          <n-empty description="Select a metric to view location statistics" />
        </div>
        
        <div v-else-if="locationStats.length === 0" class="no-data">
          <n-empty description="No data available for selected filters" />
        </div>

        <!-- Location statistics list -->
        <div v-else class="stats-list">
          <div
            v-for="stat in locationStats"
            :key="stat.location"
            class="stat-item"
            :class="{ 'highlighted': stat.location === hoveredLocation }"
            @mouseenter="handleLocationHover(stat.location)"
            @mouseleave="handleLocationHover(null)"
          >
            <!-- Location name and total -->
            <div class="location-header">
              <div class="location-name">
                <n-icon :component="LocationIcon" size="16" />
                <span>{{ stat.location }}</span>
              </div>
              <div class="location-total">
                <n-tag :type="getTagType(stat.percentage)" size="small">
                  {{ formatValue(stat.total) }} ({{ stat.percentage }}%)
                </n-tag>
              </div>
            </div>

            <!-- Category breakdowns (if available) -->
            <div v-if="stat.breakdowns && stat.breakdowns.length > 0" class="breakdowns">
              <div
                v-for="breakdown in stat.breakdowns"
                :key="breakdown.category"
                class="breakdown-item"
              >
                <span class="breakdown-label">{{ breakdown.category }}</span>
                <span class="breakdown-value">
                  {{ formatValue(breakdown.value) }} ({{ breakdown.percentage }}%)
                </span>
              </div>
            </div>

            <!-- Progress bar showing relative size -->
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: stat.percentage + '%', backgroundColor: stat.color }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Summary statistics -->
        <n-divider v-if="locationStats.length > 0" />
        
        <div v-if="locationStats.length > 0" class="summary">
          <n-statistic label="Total Locations" :value="locationStats.length" />
          <n-statistic label="Total Value" :value="formatValue(totalValue)" />
          <n-statistic label="Average" :value="formatValue(averageValue)" />
        </div>

        <!-- Category filter (if breakdowns exist) -->
        <div v-if="hasBreakdowns" class="category-filter">
          <n-divider />
          <n-text strong>Filter by Category</n-text>
          <n-select
            v-model:value="selectedCategory"
            :options="categoryOptions"
            placeholder="All categories"
            clearable
            @update:value="handleCategoryChange"
          />
        </div>
      </n-space>
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { NCard, NSpace, NEmpty, NTag, NIcon, NDivider, NStatistic, NText, NSelect } from 'naive-ui'
import { LocationOutline as LocationIcon } from '@vicons/ionicons5'
import { useDataStore } from '@/store/dataStore'

const dataStore = useDataStore()
const hoveredLocation = ref(null)
const selectedCategory = ref(null)

// Compute location statistics from filtered data
const locationStats = computed(() => {
  if (!dataStore.filteredData || dataStore.filteredData.length === 0) return []
  if (!dataStore.selectedMetric) return []

  // Group data by location
  const locationGroups = {}
  
  dataStore.filteredData.forEach(row => {
    // Determine location based on current map level
    let location = null
    if (dataStore.mapLevel === 'cities' || dataStore.filters.province) {
      location = row.city
    } else if (dataStore.mapLevel === 'provinces' || dataStore.filters.region) {
      location = row.province
    } else {
      location = row.region
    }

    if (!location) return

    if (!locationGroups[location]) {
      locationGroups[location] = {
        location,
        total: 0,
        count: 0,
        rows: []
      }
    }

    const value = parseFloat(row[dataStore.selectedMetric])
    if (!isNaN(value)) {
      locationGroups[location].total += value
      locationGroups[location].count++
      locationGroups[location].rows.push(row)
    }
  })

  // Calculate percentages and breakdowns
  const totalSum = Object.values(locationGroups).reduce((sum, group) => sum + group.total, 0)
  
  const stats = Object.values(locationGroups).map(group => {
    const percentage = totalSum > 0 ? ((group.total / totalSum) * 100).toFixed(1) : 0
    
    // Try to detect breakdown categories (gender, age_group, category, etc.)
    const breakdowns = detectBreakdowns(group.rows)
    
    return {
      location: group.location,
      total: group.total,
      count: group.count,
      percentage: parseFloat(percentage),
      breakdowns,
      color: dataStore.getColorForValue(group.total)
    }
  })

  // Sort by total value descending
  return stats.sort((a, b) => b.total - a.total)
})

// Detect breakdown categories from data
function detectBreakdowns(rows) {
  if (!rows || rows.length === 0) return []

  // Common breakdown column names
  const breakdownColumns = ['gender', 'sex', 'age_group', 'category', 'type', 'classification']
  
  // Find which breakdown columns exist in the data
  const availableBreakdowns = breakdownColumns.filter(col => 
    rows.some(row => row[col] !== undefined && row[col] !== null)
  )

  if (availableBreakdowns.length === 0) return []

  // Use the first available breakdown column
  const breakdownCol = availableBreakdowns[0]
  
  // Group by breakdown category
  const categoryGroups = {}
  rows.forEach(row => {
    const category = row[breakdownCol]
    if (!category) return

    if (!categoryGroups[category]) {
      categoryGroups[category] = { total: 0, count: 0 }
    }

    const value = parseFloat(row[dataStore.selectedMetric])
    if (!isNaN(value)) {
      categoryGroups[category].total += value
      categoryGroups[category].count++
    }
  })

  // Calculate percentages
  const totalSum = Object.values(categoryGroups).reduce((sum, group) => sum + group.total, 0)
  
  return Object.entries(categoryGroups).map(([category, group]) => ({
    category: formatCategoryName(category),
    value: group.total,
    percentage: totalSum > 0 ? ((group.total / totalSum) * 100).toFixed(1) : 0
  }))
}

// Format category names (capitalize, etc.)
function formatCategoryName(name) {
  if (!name) return 'Unknown'
  return name.toString()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Check if any location has breakdowns
const hasBreakdowns = computed(() => {
  return locationStats.value.some(stat => stat.breakdowns && stat.breakdowns.length > 0)
})

// Get unique categories for filter
const categoryOptions = computed(() => {
  if (!hasBreakdowns.value) return []
  
  const categories = new Set()
  locationStats.value.forEach(stat => {
    if (stat.breakdowns) {
      stat.breakdowns.forEach(b => categories.add(b.category))
    }
  })
  
  return Array.from(categories).map(cat => ({
    label: cat,
    value: cat
  }))
})

// Calculate total value
const totalValue = computed(() => {
  return locationStats.value.reduce((sum, stat) => sum + stat.total, 0)
})

// Calculate average value
const averageValue = computed(() => {
  if (locationStats.value.length === 0) return 0
  return totalValue.value / locationStats.value.length
})

// Format numeric values
function formatValue(value) {
  if (value === null || value === undefined) return 'N/A'
  
  // Format large numbers with commas
  if (value >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M'
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K'
  }
  
  return value.toFixed(2)
}

// Get tag type based on percentage
function getTagType(percentage) {
  if (percentage >= 20) return 'success'
  if (percentage >= 10) return 'info'
  if (percentage >= 5) return 'warning'
  return 'default'
}

// Handle location hover
function handleLocationHover(location) {
  hoveredLocation.value = location
  // Could emit event to highlight on map
}

// Handle category filter change
function handleCategoryChange(category) {
  // Could filter the displayed stats by category
  console.log('Category filter changed:', category)
}

// Watch for data changes
watch(() => dataStore.selectedMetric, () => {
  selectedCategory.value = null
})
</script>

<style scoped>
.location-stats {
  height: 100%;
  overflow-y: auto;
}

.no-data {
  padding: 20px;
  text-align: center;
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-item {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.3s ease;
  background: #ffffff;
}

.stat-item:hover,
.stat-item.highlighted {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
  transform: translateX(4px);
}

.location-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.location-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.location-total {
  font-weight: 600;
}

.breakdowns {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 8px 0;
  padding-left: 24px;
  font-size: 12px;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  color: #666;
}

.breakdown-label {
  font-weight: 500;
}

.breakdown-value {
  color: #888;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 3px;
}

.summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.category-filter {
  margin-top: 8px;
}

/* Scrollbar styling */
.location-stats::-webkit-scrollbar {
  width: 6px;
}

.location-stats::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.location-stats::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.location-stats::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
