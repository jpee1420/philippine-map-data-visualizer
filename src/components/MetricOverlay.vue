<template>
  <div class="metric-overlay">
    <n-card title="Metric Overview" :bordered="false">
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
    </n-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { NCard, NStatistic, NEmpty } from 'naive-ui'
import VChart from 'vue-echarts'
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

const stats = computed(() => dataStore.metricStats)

const chartOption = computed(() => {
  if (!dataStore.selectedMetric || dataStore.filteredData.length === 0) {
    return {}
  }
  
  // Prepare data for chart
  const data = dataStore.filteredData
    .slice(0, 20) // Limit to top 20 for readability
    .map(row => ({
      name: row.region || row.province || row.city || 'Unknown',
      value: parseFloat(row[dataStore.selectedMetric]) || 0
    }))
    .sort((a, b) => b.value - a.value)
  
  return {
    title: {
      text: `Top ${data.length} by ${dataStore.selectedMetric}`,
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
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
        interval: 0
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
  overflow-y: auto;
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
