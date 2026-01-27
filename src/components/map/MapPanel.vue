<template>
  <div class="map-panel">    
    <div class="map-container">
      <MapView ref="mapViewRef" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MapView from '@/components/map/MapView.vue'

const mapViewRef = ref(null)

defineExpose({
  recenterMap: () => {
    if (mapViewRef.value && mapViewRef.value.recenterMap) {
      mapViewRef.value.recenterMap()
    }
  },
  invalidateMapSize: () => {
    if (mapViewRef.value && mapViewRef.value.invalidateMapSize) {
      mapViewRef.value.invalidateMapSize()
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
