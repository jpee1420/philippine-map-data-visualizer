<template>
  <n-config-provider :theme="theme">
    <div class="app-container">
      <!-- Header -->
      <AppHeader 
        :current-view="currentView"
        @view-change="handleViewChange"
      />
      
      <!-- Main Content -->
      <div class="main-content">
        <!-- Left Panel: Filters -->
        <div 
          class="left-panel" 
          :class="{ 'collapsed': leftPanelCollapsed }"
          :style="{ width: leftPanelCollapsed ? '0' : `${leftPanelWidth}px` }"
        >
          <button 
            class="panel-toggle-btn left-toggle"
            @click="leftPanelCollapsed = !leftPanelCollapsed"
            :title="leftPanelCollapsed ? 'Show Filters' : 'Hide Filters'"
          >
            <span v-if="leftPanelCollapsed">▶</span>
            <span v-else>◀</span>
          </button>
          <FiltersPanel v-show="!leftPanelCollapsed" />
          <div 
            v-if="!leftPanelCollapsed"
            class="resize-handle left-resize"
            @mousedown="startResizeLeft"
          ></div>
        </div>
        
        <!-- Center Panel: Map or Table -->
        <div class="center-panel">
          <MapPanel v-if="currentView === 'map'" ref="mapPanelRef" />
          <TableView v-else />
        </div>
        
        <!-- Right Panel: Data Fields -->
        <div 
          class="right-panel" 
          :class="{ 'collapsed': rightPanelCollapsed }"
          :style="{ width: rightPanelCollapsed ? '0' : `${rightPanelWidth}px` }"
        >
          <div 
            v-if="!rightPanelCollapsed"
            class="resize-handle right-resize"
            @mousedown="startResizeRight"
          ></div>
          <button 
            class="panel-toggle-btn right-toggle"
            @click="rightPanelCollapsed = !rightPanelCollapsed"
            :title="rightPanelCollapsed ? 'Show Data Fields' : 'Hide Data Fields'"
          >
            <span v-if="rightPanelCollapsed">◀</span>
            <span v-else>▶</span>
          </button>
          <DataFieldsPanel v-show="!rightPanelCollapsed" />
        </div>
      </div>
      
      <!-- Footer -->
      <div class="app-footer">
        <!-- <span><strong>Picar Corporation</strong></span> -->
      </div>
    </div>
  </n-config-provider>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, defineAsyncComponent } from 'vue'
import { NConfigProvider } from 'naive-ui'
import AppHeader from '@/components/layout/AppHeader.vue'
import FiltersPanel from '@/components/panels/FiltersPanel.vue'
import DataFieldsPanel from '@/components/panels/DataFieldsPanel.vue'
import { useDataStore } from '@/store/dataStore'

const MapPanel = defineAsyncComponent(() => import('@/components/map/MapPanel.vue'))
const TableView = defineAsyncComponent(() => import('@/components/common/TableView.vue'))

const theme = ref(null) // null for light theme
const currentView = ref('map') // 'map' or 'table'
const leftPanelCollapsed = ref(false)
const rightPanelCollapsed = ref(false)

// Resizable panel widths
const leftPanelWidth = ref(240)
const rightPanelWidth = ref(280)
const isResizingLeft = ref(false)
const isResizingRight = ref(false)

// Map panel ref
const mapPanelRef = ref(null)

// Global data store
const dataStore = useDataStore()

const handleViewChange = (view) => {
  currentView.value = view
  // Always turn off callout labels when switching views
  if (dataStore && typeof dataStore.setShowCalloutLabels === 'function') {
    dataStore.setShowCalloutLabels(false)
  }
}

// Resize handlers
const startResizeLeft = () => {
  isResizingLeft.value = true
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
}

const startResizeRight = () => {
  isResizingRight.value = true
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
}

const handleMouseMove = (e) => {
  if (isResizingLeft.value) {
    const newWidth = e.clientX
    if (newWidth >= 200 && newWidth <= 400) {
      leftPanelWidth.value = newWidth
    }
  }
  
  if (isResizingRight.value) {
    const newWidth = window.innerWidth - e.clientX
    if (newWidth >= 200 && newWidth <= 500) {
      rightPanelWidth.value = newWidth
    }
  }
}

const stopResize = () => {
  isResizingLeft.value = false
  isResizingRight.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  
  // Notify map to adjust to new container size without recentering
  if (mapPanelRef.value && mapPanelRef.value.invalidateMapSize) {
    mapPanelRef.value.invalidateMapSize()
  }
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
})

// Watch for panel collapse/expand to adjust map size without recentering
watch([leftPanelCollapsed, rightPanelCollapsed], () => {
  nextTick(() => {
    if (mapPanelRef.value && mapPanelRef.value.invalidateMapSize) {
      mapPanelRef.value.invalidateMapSize()
    }
  })
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
  background: #f5f7fa;
}

.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.left-panel,
.right-panel {
  position: relative;
  background: white;
  overflow: hidden;
  flex-shrink: 0;
  transition: width 0.3s ease;
}

.left-panel {
  border-right: 1px solid #e8e8e8;
}

.right-panel {
  border-left: 1px solid #e8e8e8;
}

.left-panel.collapsed,
.right-panel.collapsed {
  width: 0 !important;
  border: none;
}

.center-panel {
  flex: 1;
  background: #f5f7fa;
  overflow: hidden;
  min-width: 400px;
}

/* Resize handles */
.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  z-index: 1001;
  transition: background 0.2s;
  background: transparent;
}

.resize-handle:hover {
  background: rgba(102, 126, 234, 0.35);
}

.resize-handle:active {
  background: rgba(85, 104, 211, 0.5);
}

.left-resize {
  right: -4px;
}

.right-resize {
  left: -4px;
}

/* Panel toggle buttons */
.panel-toggle-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1000;
  background: #667eea;
  color: white;
  border: none;
  width: 24px;
  height: 48px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.panel-toggle-btn:hover {
  background: #5568d3;
}

.left-toggle {
  right: -24px;
  border-radius: 0 4px 4px 0;
}

.right-toggle {
  left: -24px;
  border-radius: 4px 0 0 4px;
}

.app-footer {
  padding: 12px 24px;
  text-align: center;
  background: white;
  border-top: 1px solid #e8e8e8;
  font-size: 13px;
  color: #666;
}

/* Responsive */
@media (max-width: 1024px) {
  .resize-handle {
    display: none;
  }
  
  .left-panel,
  .right-panel {
    position: fixed;
    top: 72px;
    bottom: 0;
    z-index: 1000;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
  }
  
  .left-panel {
    left: 0;
  }
  
  .right-panel {
    right: 0;
  }
  
  .panel-toggle-btn {
    display: flex;
  }
}

@media (max-width: 768px) {
  .left-panel:not(.collapsed),
  .right-panel:not(.collapsed) {
    width: 100% !important;
  }
}
</style>
