<template>
  <div class="app-header">
    <div class="header-left">
      <div class="logo">
        <n-icon :component="BarChartIcon" size="28" color="#667eea" />
      </div>
      <div class="header-title">
        <h1>Analytics Dashboard</h1>
        <!-- <p class="subtitle">Interactive Geographic Data Visualization</p> -->
      </div>
    </div>
    
    <div class="header-right">
      <n-button-group>
        <n-button 
          :type="currentView === 'map' ? 'primary' : 'default'"
          @click="$emit('view-change', 'map')"
        >
          <template #icon>
            <n-icon :component="MapIcon" />
          </template>
          Map View
        </n-button>
        <n-button 
          :type="currentView === 'table' ? 'primary' : 'default'"
          @click="$emit('view-change', 'table')"
        >
          <template #icon>
            <n-icon :component="TableIcon" />
          </template>
          Table View
        </n-button>
      </n-button-group>
    </div>
  </div>
</template>

<script setup>
import { NButton, NButtonGroup, NIcon } from 'naive-ui'
import { Map as MapIcon, Grid as TableIcon, BarChart as BarChartIcon } from '@vicons/ionicons5'

defineProps({
  currentView: {
    type: String,
    default: 'map'
  }
})

defineEmits(['view-change'])
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
  height: 72px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-title h1 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.2;
}

.header-title .subtitle {
  font-size: 13px;
  color: #666;
  margin: 2px 0 0 0;
  line-height: 1.2;
}

.header-right {
  display: flex;
  align-items: center;
}
</style>
