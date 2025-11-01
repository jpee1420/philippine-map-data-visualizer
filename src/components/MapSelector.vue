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
              <n-radio value="cities">
                Cities & Municipalities
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
          
          <!-- Show provinces within selected region -->
          <div v-if="selectedRegion" class="sub-option">
            <n-checkbox v-model:checked="showProvincesInRegion" @update:checked="handleShowProvinces">
              Show provinces within {{ selectedRegion }}
            </n-checkbox>
          </div>
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
          
          <!-- Show cities within selected province -->
          <div v-if="selectedProvince" class="sub-option">
            <n-checkbox v-model:checked="showCitiesInProvince" @update:checked="handleShowCities">
              Show cities within {{ selectedProvince }}
            </n-checkbox>
          </div>
        </div>

        <!-- City Selector (when cities level is selected) -->
        <div v-if="selectedLevel === 'cities' && availableCities.length > 0" class="selector-group">
          <n-text strong>Select City/Municipality</n-text>
          <n-select
            v-model:value="selectedCity"
            :options="cityOptions"
            placeholder="View all cities"
            clearable
            filterable
            @update:value="handleCitySelect"
          />
        </div>

        <!-- Hide Internal Boundaries Option -->
        <div v-if="selectedLevel !== 'country'" class="selector-group">
          <n-checkbox v-model:checked="hideInternalBoundaries" @update:checked="handleHideBoundaries">
            Hide internal boundaries
          </n-checkbox>
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
const selectedCity = ref(null)
const showProvincesInRegion = ref(false)
const showCitiesInProvince = ref(false)
const hideInternalBoundaries = ref(false)

// Available locations from GeoJSON
const availableRegions = ref([])
const availableProvinces = ref([])
const availableCities = ref([])

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

const cityOptions = computed(() => 
  availableCities.value.map(city => ({
    label: city,
    value: city
  }))
)

// Current view information
const currentViewInfo = computed(() => {
  if (selectedCity.value) {
    return `Viewing: ${selectedCity.value}`
  } else if (selectedProvince.value) {
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
  selectedCity.value = null
  
  // Update store
  dataStore.setMapLevel(level)
  dataStore.setMapFocus(null)
}

function handleRegionSelect(region) {
  showProvincesInRegion.value = false
  dataStore.setMapFocus(region)
  dataStore.setShowSubdivisions(false)
}

function handleProvinceSelect(province) {
  showCitiesInProvince.value = false
  dataStore.setMapFocus(province)
  dataStore.setShowSubdivisions(false)
}

function handleCitySelect(city) {
  dataStore.setMapFocus(city)
}

function handleShowProvinces(checked) {
  if (checked && selectedRegion.value) {
    dataStore.setShowSubdivisions(true)
    dataStore.setSubdivisionLevel('provinces')
    dataStore.setParentLocation(selectedRegion.value)
  } else {
    dataStore.setShowSubdivisions(false)
  }
}

function handleShowCities(checked) {
  if (checked && selectedProvince.value) {
    dataStore.setShowSubdivisions(true)
    dataStore.setSubdivisionLevel('cities')
    dataStore.setParentLocation(selectedProvince.value)
  } else {
    dataStore.setShowSubdivisions(false)
  }
}

function handleHideBoundaries(checked) {
  dataStore.setHideInternalBoundaries(checked)
}

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
  } else if (selectedLevel.value === 'cities') {
    availableCities.value = Array.from(locations).sort()
  }
}, { immediate: true })

// Sync with store map level
watch(() => dataStore.mapLevel, (level) => {
  selectedLevel.value = level
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

.sub-option {
  margin-top: 8px;
  padding-left: 4px;
}
</style>
