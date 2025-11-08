<template>
  <div class="map-panel">    
    <!-- Filter Bar -->
    <FilterBar />
    <div class="map-container">
      <MapView ref="mapViewRef" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { NButton, NButtonGroup, NIcon } from 'naive-ui'
import { Search as SearchIcon, Expand as ExpandIcon } from '@vicons/ionicons5'
import MapView from '@/components/MapView.vue'
import Legend from '@/components/Legend.vue'
import FilterBar from '@/components/common/FilterBar.vue'

const zoomLevel = ref(100)
const mapViewRef = ref(null)

defineEmits(['zoom-in', 'zoom-out', 'fullscreen'])

// Expose method to recenter map
defineExpose({
  recenterMap: () => {
    if (mapViewRef.value && mapViewRef.value.recenterMap) {
      mapViewRef.value.recenterMap()
    }
  }
})
</script>

<style scoped>
.map-panel {
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  border-radius: 0;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
}

.map-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.map-controls {
  display: flex;
  gap: 8px;
}

.map-container {
  flex: 1;
  position: relative;
  background: #f5f7fa;
}

.map-legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 500;
}

.zoom-indicator {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 500;
}
</style>
