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
              :key="item.code"
              :checked="isSubdivisionChecked(item.code)"
              @update:checked="(checked) => toggleSubdivision(item.code, checked)"
            >
              {{ item.name }}
            </n-checkbox>
          </div>
        </div>

        <div v-if="selectedLevel === 'provinces' && selectedProvince" class="selector-group">
          <n-text strong>Cities/Municipalities in {{ selectedProvince }}</n-text>
          <div class="checkbox-list">
            <n-checkbox
              v-for="item in subdivisions"
              :key="item.code"
              :checked="isSubdivisionChecked(item.code)"
              @update:checked="(checked) => toggleSubdivision(item.code, checked)"
            >
              {{ item.name }}
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
import { ref, computed, watch, onMounted } from 'vue'
import { NCard, NSpace, NText, NRadioGroup, NRadio, NSelect, NAlert, NCheckbox } from 'naive-ui'
import { useDataStore } from '@/store/dataStore'
import { normalizeLocationName } from '@/utils/nameUtils'
import { BOUNDARY_PATHS, NCR_REGION_NAME } from '@/config/mapConfig'
import { loadGeoJSON } from '@/utils/geoUtils'

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
  if (region) {
    loadSubdivisions()
  }
}

function handleProvinceSelect(province) {
  dataStore.setMapFocus(province)
  clearSubdivisions()
  if (province) {
    loadSubdivisions()
  }
}

// City select removed

function isSubdivisionChecked(item) {
  return selectedSubdivisionSet.value.has(String(item))
}

function toggleSubdivision(item, checked) {
  const key = String(item)
  if (checked) selectedSubdivisionSet.value.add(key)
  else selectedSubdivisionSet.value.delete(key)
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
		const isNCR = selectedRegion.value.includes(NCR_REGION_NAME)
		if (isNCR) {
			// NCR: treat its cities/municipalities (ADM3) as subdivisions
			try {
				const adm3 = await loadGeoJSON(`${basePath}${BOUNDARY_PATHS.cities}`)
				const regionName = normalizeLocationName(selectedRegion.value)
				const items = (adm3.features || [])
					.filter(f => {
						const p = f.properties || {}
						return normalizeLocationName(p.ADM1_EN) === regionName
					})
					.map(f => {
						const p = f.properties || {}
						const name = normalizeLocationName(p.ADM3_EN)
						const code = String(p.ADM3_PCODE || name)
						return { code, name }
					})
					.filter(it => it.name)
				const unique = new Map(items.map(it => [it.code, it]))
				subdivisions.value = Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name))
			} catch (e) {
				console.warn('Failed to load ADM3 for NCR city/municipality subdivisions:', e)
				subdivisions.value = []
			}
		} else {
			// Non-NCR regions: subdivisions are provinces (ADM2)
			try {
				const adm2 = await loadGeoJSON(`${basePath}${BOUNDARY_PATHS.provinces}`)
				const regionName = normalizeLocationName(selectedRegion.value)
				const items = (adm2.features || [])
					.filter(f => {
						const p = f.properties || {}
						return normalizeLocationName(p.ADM1_EN) === regionName
					})
					.map(f => {
						const p = f.properties || {}
						const name = normalizeLocationName(p.ADM2_EN)
						const code = String(p.ADM2_PCODE || name)
						return { code, name }
					})
					.filter(it => it.name)
				const unique = new Map(items.map(it => [it.code, it]))
				subdivisions.value = Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name))
			} catch (e) {
				console.warn('Failed to load ADM2 for region subdivisions:', e)
				subdivisions.value = []
			}
		}
	} else if (selectedLevel.value === 'provinces' && selectedProvince.value) {
		try {
			// Determine the ADM2_PCODE for the selected province name
			const adm2Provinces = await loadGeoJSON(`${basePath}${BOUNDARY_PATHS.provinces}`)
			const provinceName = normalizeLocationName(selectedProvince.value)
			let provinceCode = null
			;(adm2Provinces.features || []).some(f => {
				const p = f.properties || {}
				if (normalizeLocationName(p.ADM2_EN) === provinceName) {
					provinceCode = String(p.ADM2_PCODE || '')
					return true
				}
				return false
			})
			if (!provinceCode) {
				console.warn('Could not resolve ADM2_PCODE for province', selectedProvince.value)
				subdivisions.value = []
				return
			}
			// Load ADM3 and filter by ADM2_PCODE
			const adm3 = await loadGeoJSON(`${basePath}${BOUNDARY_PATHS.cities}`)
			const items = (adm3.features || [])
				.filter(f => {
					const p = f.properties || {}
					return String(p.ADM2_PCODE || '') === provinceCode
				})
				.map(f => {
					const p = f.properties || {}
					const name = normalizeLocationName(p.ADM3_EN)
					const code = String(p.ADM3_PCODE || name)
					return { code, name }
				})
				.filter(it => it.name)
			const unique = new Map(items.map(it => [it.code, it]))
			subdivisions.value = Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name))
		} catch (e) {
			console.warn('Failed to load ADM3 for province subdivisions:', e)
			subdivisions.value = []
		}
	} else {
		subdivisions.value = []
	}
}

async function loadRegionProvinceLists() {
	const basePath = import.meta.env.BASE_URL || '/'
	try {
		const adm2 = await loadGeoJSON(`${basePath}${BOUNDARY_PATHS.provinces}`)
		const regions = new Set()
		const provinces = new Set()
		;(adm2.features || []).forEach(f => {
			const p = f.properties || {}
			if (p.ADM1_EN) regions.add(normalizeLocationName(p.ADM1_EN))
			if (p.ADM2_EN) provinces.add(normalizeLocationName(p.ADM2_EN))
		})
		availableRegions.value = Array.from(regions).sort()
		availableProvinces.value = Array.from(provinces).sort()
	} catch (e) {
		console.warn('Failed to load ADM2 for selector lists:', e)
		availableRegions.value = []
		availableProvinces.value = []
	}
}

onMounted(() => {
	loadRegionProvinceLists()
})

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

.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
}

.checkbox-list :deep(.n-checkbox) {
  display: block;
  white-space: normal;
}
</style>
