<template>
  <div class="map-selector">
    <n-card size="small" title="Map View">
      <n-space vertical>
        <!-- Map Level Selection -->
        <div class="selector-group">
          <n-text strong>View Level</n-text>
          <n-radio-group v-model:value="selectedLevel" @update:value="handleLevelChange">
            <n-space vertical>
              <n-radio value="country">
                🇵🇭 Philippines (Country)
              </n-radio>
              <n-radio value="regions">
                Regions
              </n-radio>
              <n-radio value="provinces">
                Provinces
              </n-radio>
            </n-space>
          </n-radio-group>
        </div>

        <!-- Region Selector (when regions level is selected) -->
        <div v-if="selectedLevel === 'regions' && availableRegions.length > 0" class="selector-group">
          <n-text strong>Select Region</n-text>
          <n-select
            v-model:value="selectedRegion"
            :options="regionOptions"
            placeholder="View all regions"
            clearable
            filterable
            @update:value="handleRegionSelect"
          />
        </div>

        <!-- Province Selector (when provinces level is selected) -->
        <div v-if="selectedLevel === 'provinces' && availableProvinces.length > 0" class="selector-group">
          <n-text strong>Select Province</n-text>
          <n-select
            v-model:value="selectedProvince"
            :options="provinceOptions"
            placeholder="View all provinces"
            clearable
            filterable
            @update:value="handleProvinceSelect"
          />
        </div>

        <!-- Subdivision checklist -->
        <div v-if="selectedLevel === 'regions' && selectedRegion" class="selector-group">
          <n-text strong>Provinces in {{ selectedRegion }}</n-text>
          <div class="checkbox-list">
            <n-checkbox
              v-for="item in subdivisions"
              :key="item"
              :checked="isSubdivisionChecked(item)"
              @update:checked="(checked) => toggleSubdivision(item, checked)"
            >
              {{ item }}
            </n-checkbox>
          </div>
        </div>

        <div v-if="selectedLevel === 'provinces' && selectedProvince" class="selector-group">
          <n-text strong>Cities/Municipalities in {{ selectedProvince }}</n-text>
          <div class="checkbox-list">
            <n-checkbox
              v-for="item in subdivisions"
              :key="item"
              :checked="isSubdivisionChecked(item)"
              @update:checked="(checked) => toggleSubdivision(item, checked)"
            >
              {{ item }}
            </n-checkbox>
          </div>
        </div>

        <!-- Current View Info -->
        <n-alert v-if="currentViewInfo" type="info" size="small">
          <template #icon>
            <span>📌</span>
          </template>
          {{ currentViewInfo }}
        </n-alert>
      </n-space>
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { NCard, NSpace, NText, NRadioGroup, NRadio, NSelect, NAlert, NCheckbox } from 'naive-ui'
import { useDataStore } from '@/store/dataStore'

const dataStore = useDataStore()

const selectedLevel = ref('country')
const selectedRegion = ref(null)
const selectedProvince = ref(null)

// Available locations from GeoJSON
const availableRegions = ref([])
const availableProvinces = ref([])
// City list removed

// Subdivisions within current focus
const subdivisions = ref([])
const selectedSubdivisionSet = ref(new Set())

// Computed options for selects
const regionOptions = computed(() => 
  availableRegions.value.map(region => ({
    label: region,
    value: region
  }))
)

const provinceOptions = computed(() => 
  availableProvinces.value.map(province => ({
    label: province,
    value: province
  }))
)

// City options removed

// Current view information
const currentViewInfo = computed(() => {
  if (selectedProvince.value) {
    return `Viewing: ${selectedProvince.value}`
  } else if (selectedRegion.value) {
    return `Viewing: ${selectedRegion.value}`
  } else if (selectedLevel.value === 'country') {
    return 'Viewing: Philippines'
  }
  return null
})

// Handlers
function handleLevelChange(level) {
  // Clear selections when changing levels
  selectedRegion.value = null
  selectedProvince.value = null
  // City selection removed
  
  // Update store
  dataStore.setMapLevel(level)
  dataStore.setMapFocus(null)
  clearSubdivisions()
}

function handleRegionSelect(region) {
  dataStore.setMapFocus(region)
  clearSubdivisions()
  loadSubdivisions()
}

function handleProvinceSelect(province) {
  dataStore.setMapFocus(province)
  clearSubdivisions()
  loadSubdivisions()
}

// City select removed

function isSubdivisionChecked(item) {
  return selectedSubdivisionSet.value.has(item)
}

function toggleSubdivision(item, checked) {
  if (checked) selectedSubdivisionSet.value.add(item)
  else selectedSubdivisionSet.value.delete(item)
  dataStore.setSelectedSubdivisions(Array.from(selectedSubdivisionSet.value))
}

function clearSubdivisions() {
  selectedSubdivisionSet.value.clear()
  subdivisions.value = []
  dataStore.setSelectedSubdivisions([])
}

async function loadSubdivisions() {
  const basePath = import.meta.env.BASE_URL || '/'
  if (selectedLevel.value === 'regions' && selectedRegion.value) {
    const resp = await fetch(`${basePath}data/geoBoundaries-PHL-ADM2_simplified_with_psgc.geojson`)
    const adm2 = await resp.json()
    const focusNorm = selectedRegion.value.toLowerCase().trim()
    const list = adm2.features
      .filter(f => {
        const props = f.properties || {}
        const group = (props.shapeGroup || props.region || '').toLowerCase().trim()
        return group === focusNorm
      })
      .map(f => f.properties.shapeName)
      .filter(Boolean)
    subdivisions.value = Array.from(new Set(list)).sort()
  } else if (selectedLevel.value === 'provinces' && selectedProvince.value) {
    const resp = await fetch(`${basePath}data/geoBoundaries-PHL-ADM3_simplified_with_psgc.geojson`)
    const adm3 = await resp.json()
    const focusNorm = selectedProvince.value.toLowerCase().trim()
    const list = adm3.features
      .filter(f => {
        const props = f.properties || {}
        const group = (props.shapeGroup || props.province || '').toLowerCase().trim()
        return group === focusNorm
      })
      .map(f => f.properties.shapeName)
      .filter(Boolean)
    subdivisions.value = Array.from(new Set(list)).sort()
  } else {
    subdivisions.value = []
  }
}
// City subdivisions removed


// Watch for GeoJSON data to extract available locations
watch(() => dataStore.geoData, (geoData) => {
  if (!geoData || !geoData.features) return
  
  const locations = new Set()
  geoData.features.forEach(feature => {
    const props = feature.properties
    const name = props.shapeName || props.shapeGroup || props.name || props.region || props.province || props.city
    if (name) locations.add(name)
  })
  
  // Update available locations based on current level
  if (selectedLevel.value === 'regions') {
    availableRegions.value = Array.from(locations).sort()
  } else if (selectedLevel.value === 'provinces') {
    availableProvinces.value = Array.from(locations).sort()
  }
}, { immediate: true })

// Sync with store map level
watch(() => dataStore.mapLevel, (level) => {
  selectedLevel.value = level
})

watch([selectedLevel, selectedRegion, selectedProvince], () => {
  clearSubdivisions()
  loadSubdivisions()
})
</script>

<style scoped>
.map-selector {
  margin-bottom: 16px;
}

.selector-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
