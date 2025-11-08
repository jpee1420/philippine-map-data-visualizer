<template>
  <n-config-provider :theme="theme">
    <n-layout class="app-layout">
      <n-layout-header bordered class="app-header">
        <div class="header-content">
          <!-- <h1>🗺️ Philippine Map Visualizer</h1>
          <n-text depth="3">Interactive data mapping with Vue 3, Leaflet, and ECharts</n-text> -->
        </div>
      </n-layout-header>
      
      <n-layout has-sider class="main-layout">
        <n-layout-sider
          bordered
          :width="320"
          :collapsed-width="0"
          :show-trigger="isMobile ? 'arrow-circle' : false"
          collapse-mode="width"
          content-style="padding: 16px; overflow-y: auto; height: 100%;"
        >
          <MapSelector />
          <DataUploader />
          <Filters />
        </n-layout-sider>
        
        <n-layout-content content-style="padding: 16px;">
          <div class="content-grid" :class="{ 
            'location-collapsed': locationBreakdownCollapsed,
            'metric-collapsed': metricOverlayCollapsed,
            'both-collapsed': locationBreakdownCollapsed && metricOverlayCollapsed
          }">
            <div class="map-section">
              <MapView />
              <Legend />
            </div>
            
            <div class="location-breakdown-section" v-show="!locationBreakdownCollapsed">
              <button 
                class="panel-collapse-btn location-collapse-btn"
                @click="locationBreakdownCollapsed = !locationBreakdownCollapsed"
                title="Collapse Location Breakdown"
              >
                ▶
              </button>
              <LocationBreakdown />
            </div>
            
            <div class="metrics-section" v-show="!metricOverlayCollapsed">
              <button 
                class="panel-collapse-btn metric-collapse-btn"
                @click="metricOverlayCollapsed = !metricOverlayCollapsed"
                title="Collapse Metric Overview"
              >
                ▶
              </button>
              <MetricOverlay />
            </div>
            
            <!-- Expand buttons when collapsed -->
            <button 
              v-if="locationBreakdownCollapsed"
              class="panel-expand-btn location-expand-btn"
              @click="locationBreakdownCollapsed = false"
              title="Show Location Breakdown"
            >
              ◀
            </button>
            
            <button 
              v-if="metricOverlayCollapsed"
              class="panel-expand-btn metric-expand-btn"
              @click="metricOverlayCollapsed = false"
              title="Show Metric Overview"
            >
              ◀
            </button>
          </div>
        </n-layout-content>
      </n-layout>
      
      <n-layout-footer bordered class="app-footer">
        <n-text depth="3">
          Picar Corporation
        </n-text>
      </n-layout-footer>
    </n-layout>
  </n-config-provider>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  NConfigProvider, NLayout, NLayoutHeader, NLayoutSider, 
  NLayoutContent, NLayoutFooter, NText 
} from 'naive-ui'
import MapView from '@/components/MapView.vue'
import MetricOverlay from '@/components/MetricOverlay.vue'
import DataUploader from '@/components/DataUploader.vue'
import Filters from '@/components/Filters.vue'
import Legend from '@/components/Legend.vue'
import MapSelector from '@/components/MapSelector.vue'
import LocationBreakdown from '@/components/LocationBreakdown.vue'

const theme = ref(null) // null for light theme
const locationBreakdownCollapsed = ref(false)
const metricOverlayCollapsed = ref(false)

const isMobile = computed(() => {
  return window.innerWidth < 768
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.app-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  padding: 16px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header-content h1 {
  font-size: 24px;
  margin-bottom: 4px;
  color: white;
}

.header-content .n-text {
  color: rgba(255, 255, 255, 0.9);
}

.main-layout {
  flex: 1;
  overflow: hidden;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 350px 350px;
  /* gap: 16px; */
  height: 100%;
  transition: grid-template-columns 0.3s ease;
  position: relative;
}

/* When location breakdown is collapsed */
.content-grid.location-collapsed {
  grid-template-columns: 1fr 0 350px;
}

/* When metric overview is collapsed */
.content-grid.metric-collapsed {
  grid-template-columns: 1fr 350px 0;
}

/* When both are collapsed */
.content-grid.both-collapsed {
  grid-template-columns: 1fr 0 0;
}

.map-section {
  position: relative;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  height: 100%;
  min-height: 600px;
}

.location-breakdown-section,
.metrics-section {
  position: relative;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Collapse button on each panel */
.panel-collapse-btn {
  position: absolute;
  top: 50%;
  left: -16px;
  transform: translateY(-50%);
  z-index: 1000;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px 0 0 4px;
  padding: 12px 8px;
  cursor: pointer;
  font-size: 14px;
  box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.panel-collapse-btn:hover {
  background: #5568d3;
  padding-left: 12px;
}

/* Expand buttons when panels are collapsed */
.panel-expand-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1000;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  padding: 12px 8px;
  cursor: pointer;
  font-size: 14px;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.location-expand-btn {
  right: 366px; /* 350px panel + 16px gap */
}

.metric-expand-btn {
  right: 16px;
}

.content-grid.location-collapsed .location-expand-btn {
  right: 366px;
}

.content-grid.metric-collapsed .metric-expand-btn {
  right: 16px;
}

.content-grid.both-collapsed .location-expand-btn {
  right: 60px;
}

.content-grid.both-collapsed .metric-expand-btn {
  right: 16px;
}

.panel-expand-btn:hover {
  background: #5568d3;
  padding-right: 12px;
}

.app-footer {
  padding: 12px 24px;
  text-align: center;
}

/* Left sidebar scrollbar styling */
.n-layout-sider :deep(.n-layout-scroll-container) {
  overflow-y: auto !important;
  height: 100%;
}

.n-layout-sider :deep(.n-layout-scroll-container)::-webkit-scrollbar {
  width: 8px;
}

.n-layout-sider :deep(.n-layout-scroll-container)::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.n-layout-sider :deep(.n-layout-scroll-container)::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.n-layout-sider :deep(.n-layout-scroll-container)::-webkit-scrollbar-thumb:hover {
  background: #555;
}

@media (max-width: 1400px) {
  .content-grid {
    grid-template-columns: 1fr !important;
    grid-template-rows: 500px auto auto;
  }
  
  .panel-collapse-btn,
  .panel-expand-btn {
    display: none;
  }
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr !important;
    grid-template-rows: 500px auto auto;
  }
}

@media (max-width: 768px) {
  .app-header {
    padding: 12px 16px;
  }
  
  .header-content h1 {
    font-size: 18px;
  }
  
  .content-grid {
    grid-template-rows: 400px auto auto;
  }
}
</style>
