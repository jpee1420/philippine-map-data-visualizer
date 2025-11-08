<template>
  <div class="metric-overlay">
    <n-card size="small">
      <template #header>
        <div class="card-header">
          <span>Metric Overview</span>
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
        <!-- Metric Stats -->
        <div class="stats-grid">
          <n-statistic label="Minimum" :value="stats.min.toFixed(2)" />
          <n-statistic label="Maximum" :value="stats.max.toFixed(2)" />
          <n-statistic label="Average" :value="stats.avg.toFixed(2)" />
          <n-statistic label="Total" :value="stats.sum.toFixed(2)" />
        </div>
        
        <!-- Chart -->
        <div class="chart-container" v-if="dataStore.selectedMetric">
          <v-chart :option="chartOption" :autoresize="true" />
        </div>
        
        <!-- No data message -->
        <n-empty 
          v-if="!dataStore.selectedMetric || dataStore.filteredData.length === 0"
          description="No data available. Upload data and select a metric."
        />
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { NCard, NSpace, NStatistic, NEmpty, NButton, NIcon } from 'naive-ui'
import { ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon } from '@vicons/ionicons5'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { useDataStore } from '@/store/dataStore'

// Register ECharts components
use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const dataStore = useDataStore()
const collapsed = ref(false)

const stats = computed(() => dataStore.metricStats)

const chartOption = computed(() => {
  if (!dataStore.selectedMetric || dataStore.filteredData.length === 0) {
    return {}
  }
  
  // Determine the appropriate level to display based on filters
  let locationKey = 'region'
  let titleSuffix = 'Regions'
  
  if (dataStore.filters.region && !dataStore.filters.province) {
    // If filtering by region, show provinces
    locationKey = 'province'
    titleSuffix = `Provinces in ${dataStore.filters.region}`
  } else if (dataStore.filters.province && !dataStore.filters.city) {
    // If filtering by province, show cities
    locationKey = 'city'
    titleSuffix = `Cities in ${dataStore.filters.province}`
  } else if (dataStore.filters.city) {
    // If filtering by city, show city
    locationKey = 'city'
    titleSuffix = dataStore.filters.city
  }
  
  // Group data by the appropriate location key and aggregate
  const aggregated = {}
  dataStore.filteredData.forEach(row => {
    const locationName = row[locationKey]
    if (locationName) {
      if (!aggregated[locationName]) {
        aggregated[locationName] = []
      }
      const value = parseFloat(row[dataStore.selectedMetric])
      if (!isNaN(value)) {
        aggregated[locationName].push(value)
      }
    }
  })
  
  // Calculate average or sum for each location
  const data = Object.entries(aggregated)
    .map(([name, values]) => ({
      name,
      value: values.reduce((a, b) => a + b, 0) / values.length // Average
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20) // Limit to top 20 for readability
  
  return {
    title: {
      text: `Top ${data.length} ${titleSuffix} by ${dataStore.selectedMetric}`,
      left: 'center',
      textStyle: {
        fontSize: 14
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params) => {
        const param = params[0]
        return `<strong>${param.name}</strong><br/>${dataStore.selectedMetric}: ${param.value.toFixed(2)}`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLabel: {
        rotate: 45,
        interval: 0,
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: dataStore.selectedMetric,
        type: 'bar',
        data: data.map(d => d.value),
        itemStyle: {
          color: '#18a058'
        }
      }
    ]
  }
})
</script>

<style scoped>
.metric-overlay {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.metric-overlay :deep(.n-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.metric-overlay :deep(.n-card__content) {
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.chart-container {
  width: 100%;
  height: 400px;
  margin-top: 20px;
}
</style>
