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
      
      <!-- Hierarchical Filter Section -->
      <div class="property-section" v-if="showHierarchicalFilter">
        <div class="section-label">{{ hierarchicalFilterLabel }}</div>
        <div class="checkbox-list">
          <n-checkbox
            v-for="item in hierarchicalFilterItems"
            :key="item"
            :checked="isItemSelected(item)"
            @update:checked="(checked) => toggleItem(item, checked)"
          >
            {{ item }}
          </n-checkbox>
        </div>
      </div>
      
      <!-- Data Uploader -->
      <div class="property-section">
        <DataUploader />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { NSelect, NCheckbox, NIcon } from 'naive-ui'
import { Funnel as FilterIcon } from '@vicons/ionicons5'
import { useDataStore } from '@/store/dataStore'
import MapSelector from '@/components/MapSelector.vue'
import DataUploader from '@/components/DataUploader.vue'

const dataStore = useDataStore()

const selectedItems = ref(new Set())

// Clear selected items when map focus changes
watch(() => dataStore.mapFocus, () => {
  selectedItems.value.clear()
  dataStore.setSelectedSubdivisions([])
})

// Determine what to show based on map level and focus
const showHierarchicalFilter = computed(() => {
  const level = dataStore.mapLevel
  const focus = dataStore.mapFocus
  
  // Show provinces when region level is selected AND a specific region is focused
  if (level === 'regions' && focus) {
    return true
  }
  
  // Show cities when province level is selected AND a specific province is focused
  if (level === 'provinces' && focus) {
    return true
  }
  
  return false
})

const hierarchicalFilterLabel = computed(() => {
  const level = dataStore.mapLevel
  const focus = dataStore.mapFocus
  
  if (level === 'regions' && focus) {
    return `Provinces in ${focus}`
  }
  
  if (level === 'provinces' && focus) {
    return `Cities in ${focus}`
  }
  
  return 'Filter'
})

const hierarchicalFilterItems = ref([])

// Region to provinces mapping
const regionProvinceMap = {
  'Ilocos Region': ['Ilocos Norte', 'Ilocos Sur', 'La Union', 'Pangasinan'],
  'Cagayan Valley': ['Batanes', 'Cagayan', 'Isabela', 'Nueva Vizcaya', 'Quirino'],
  'Central Luzon': ['Aurora', 'Bataan', 'Bulacan', 'Nueva Ecija', 'Pampanga', 'Tarlac', 'Zambales'],
  'CALABARZON': ['Batangas', 'Cavite', 'Laguna', 'Quezon', 'Rizal'],
  'MIMAROPA': ['Marinduque', 'Occidental Mindoro', 'Oriental Mindoro', 'Palawan', 'Romblon'],
  'Bicol Region': ['Albay', 'Camarines Norte', 'Camarines Sur', 'Catanduanes', 'Masbate', 'Sorsogon'],
  'Western Visayas': ['Aklan', 'Antique', 'Capiz', 'Guimaras', 'Iloilo', 'Negros Occidental'],
  'Central Visayas': ['Bohol', 'Cebu', 'Negros Oriental', 'Siquijor'],
  'Eastern Visayas': ['Biliran', 'Eastern Samar', 'Leyte', 'Northern Samar', 'Samar', 'Southern Leyte'],
  'Zamboanga Peninsula': ['Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay'],
  'Northern Mindanao': ['Bukidnon', 'Camiguin', 'Lanao del Norte', 'Misamis Occidental', 'Misamis Oriental'],
  'Davao Region': ['Davao de Oro', 'Davao del Norte', 'Davao del Sur', 'Davao Occidental', 'Davao Oriental'],
  'SOCCSKSARGEN': ['Cotabato', 'Sarangani', 'South Cotabato', 'Sultan Kudarat'],
  'Caraga': ['Agusan del Norte', 'Agusan del Sur', 'Dinagat Islands', 'Surigao del Norte', 'Surigao del Sur'],
  'Cordillera Administrative Region': ['Abra', 'Apayao', 'Benguet', 'Ifugao', 'Kalinga', 'Mountain Province']
}

// Load hierarchical items when focus changes  
watch([() => dataStore.mapLevel, () => dataStore.mapFocus], async ([level, focus]) => {
  if (!focus) {
    hierarchicalFilterItems.value = []
    return
  }
  
  try {
    // For regions level, get provinces from mapping
    if (level === 'regions') {
      const provinces = regionProvinceMap[focus] || []
      console.log('Provinces for', focus, ':', provinces)
      hierarchicalFilterItems.value = provinces
    }
    
    // For provinces level, load cities from user's dataset
    if (level === 'provinces') {
      const items = new Set()
      
      console.log('Loading cities for province:', focus)
      
      // Get cities from user's dataset that belong to this province
      if (dataStore.dataset && dataStore.dataset.length > 0) {
        dataStore.dataset.forEach(row => {
          // Match province using alias-aware matching
          const rowProvince = row.province
          if (rowProvince) {
            // Check if row's province matches the focused province
            const matchesExact = rowProvince === focus
            const matchesLower = rowProvince.toLowerCase().trim() === focus.toLowerCase().trim()
            
            if ((matchesExact || matchesLower) && row.city) {
              items.add(row.city)
            }
          }
        })
      }
      
      console.log('Cities found in dataset for', focus, ':', items.size)
      hierarchicalFilterItems.value = Array.from(items).sort()
      console.log('Final city list:', hierarchicalFilterItems.value)
    }
  } catch (error) {
    console.error('Error loading hierarchical items:', error)
    hierarchicalFilterItems.value = []
  }
}, { immediate: true })

const isItemSelected = (item) => {
  return selectedItems.value.has(item)
}

const toggleItem = (item, checked) => {
  const level = dataStore.mapLevel
  
  if (checked) {
    selectedItems.value.add(item)
  } else {
    selectedItems.value.delete(item)
  }
  
  // Update the store with selected boundaries to show
  const selectedArray = Array.from(selectedItems.value)
  
  if (level === 'regions') {
    // Store selected provinces to show their boundaries
    dataStore.setSelectedSubdivisions(selectedArray)
  } else if (level === 'provinces') {
    // Store selected cities to show their boundaries
    dataStore.setSelectedSubdivisions(selectedArray)
  }
}
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
