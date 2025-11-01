<template>
  <n-config-provider :theme="theme">
    <n-layout class="app-layout">
      <!-- Header -->
      <n-layout-header bordered class="app-header">
        <div class="header-content">
          <h1>🗺️ Philippine Map Visualizer</h1>
          <n-text depth="3">Interactive data mapping with Vue 3, Leaflet, and ECharts</n-text>
        </div>
      </n-layout-header>
      
      <!-- Main Content -->
      <n-layout has-sider class="main-layout">
        <!-- Sidebar -->
        <n-layout-sider
          bordered
          :width="320"
          :collapsed-width="0"
          :show-trigger="isMobile ? 'arrow-circle' : false"
          collapse-mode="width"
          content-style="padding: 16px;"
        >
          <MapSelector />
          <DataUploader />
          <Filters />
        </n-layout-sider>
        
        <!-- Content Area -->
        <n-layout-content content-style="padding: 16px;">
          <div class="content-grid">
            <!-- Map Section -->
            <div class="map-section">
              <MapView />
              <Legend />
            </div>
            
            <!-- Metrics Section -->
            <div class="metrics-section">
              <MetricOverlay />
            </div>
          </div>
        </n-layout-content>
      </n-layout>
      
      <!-- Footer -->
      <n-layout-footer bordered class="app-footer">
        <n-text depth="3">
          Built with Vue 3 + Leaflet + ECharts | Data visualization framework for Philippine mapping
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

const theme = ref(null) // null for light theme

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
  grid-template-columns: 1fr 400px;
  gap: 16px;
  height: 100%;
}

.map-section {
  position: relative;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  height: 100%;
  min-height: 600px;
}

.metrics-section {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.app-footer {
  padding: 12px 24px;
  text-align: center;
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
    grid-template-rows: 500px 1fr;
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
    grid-template-rows: 400px 1fr;
  }
}
</style>
