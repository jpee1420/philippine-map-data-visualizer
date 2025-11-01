<template>
  <div class="legend" v-if="dataStore.selectedMetric">
    <n-card size="small" :bordered="false">
      <div class="legend-content">
        <n-text strong style="margin-bottom: 12px; display: block;">
          {{ dataStore.selectedMetric }}
        </n-text>
        
        <div class="color-scale">
          <div 
            v-for="(color, index) in colorScale.colors" 
            :key="index"
            class="color-block"
            :style="{ backgroundColor: color }"
          />
        </div>
        
        <div class="scale-labels">
          <n-text depth="3" style="font-size: 12px;">
            {{ colorScale.min.toFixed(0) }}
          </n-text>
          <n-text depth="3" style="font-size: 12px;">
            {{ colorScale.max.toFixed(0) }}
          </n-text>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { NCard, NText } from 'naive-ui'
import { useDataStore } from '@/store/dataStore'

const dataStore = useDataStore()

const colorScale = computed(() => dataStore.colorScale)
</script>

<style scoped>
.legend {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  min-width: 200px;
}

.legend-content {
  display: flex;
  flex-direction: column;
}

.color-scale {
  display: flex;
  height: 20px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.color-block {
  flex: 1;
}

.scale-labels {
  display: flex;
  justify-content: space-between;
}
</style>
