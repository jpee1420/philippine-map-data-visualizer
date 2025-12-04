<template>
  <div class="filters-panel">
    <div class="panel-header">
      <n-icon :component="FilterIcon" size="18" />
      <span>Properties</span>
    </div>
    
    <div class="panel-content">
      <!-- Map View Section -->
      <div class="property-section">
        <div class="section-label">Map View</div>
        <MapSelector />
      </div>
      
      <!-- Data Uploader -->
      <div class="property-section">
        <DataUploader />
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'
import { NIcon } from 'naive-ui'
import { Funnel as FilterIcon } from '@vicons/ionicons5'

const MapSelector = defineAsyncComponent(() => import('@/components/map/MapSelector.vue'))
const DataUploader = defineAsyncComponent(() => import('@/components/panels/DataUploader.vue'))

</script>

<style scoped>
.filters-panel {
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e8e8e8;
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
  overflow-y: auto;
  padding: 20px;
}

.property-section {
  margin-bottom: 20px;
}

.property-section:last-child {
  margin-bottom: 0;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
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
  background: #555;
}

.checkbox-list::-webkit-scrollbar {
  width: 6px;
}

.checkbox-list::-webkit-scrollbar-track {
  background: #f5f5f5;
}

.checkbox-list::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.checkbox-list::-webkit-scrollbar-thumb:hover {
  background: #999;
}
</style>
