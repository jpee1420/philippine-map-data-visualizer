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
import { normalizeGADMName } from '@/utils/nameUtils'
import { NCR_REGION_NAME, NCR_PARENT_NAME, GADM_FILES } from '@/config/mapConfig'

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
			try {
				const resp = await fetch(`${basePath}${GADM_FILES.ADM2}`)
				const adm2 = await resp.json()
				const ncrParentName = normalizeGADMName(NCR_PARENT_NAME)
				const items = (adm2.features || [])
					.filter(f => {
						const p = f.properties || {}
						return normalizeGADMName(p.NAME_1) === ncrParentName
					})
					.map(f => {
						const p = f.properties || {}
						const name = normalizeGADMName(p.NAME_2)
						return { code: name, name }
					})
					.filter(it => it.name)
				const unique = new Map(items.map(it => [it.code, it]))
				subdivisions.value = Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name))
			} catch (e) {
				console.warn('Failed to load GADM level-2 for NCR city/municipality subdivisions:', e)
				subdivisions.value = []
			}
		} else {
			try {
				const resp = await fetch(`${basePath}${GADM_FILES.ADM1}`)
				const adm1 = await resp.json()
				const items = (adm1.features || [])
					.filter(f => {
						const p = f.properties || {}
						return normalizeGADMName(p.NAME_0) === selectedRegion.value
					})
					.map(f => {
						const p = f.properties || {}
						const name = normalizeGADMName(p.NAME_1)
						return { code: name, name }
					})
					.filter(it => it.name)
				const unique = new Map(items.map(it => [it.code, it]))
				subdivisions.value = Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name))
			} catch (e) {
				console.warn('Failed to load GADM level-1 for region subdivisions:', e)
				subdivisions.value = []
			}
		}
	} else if (selectedLevel.value === 'provinces' && selectedProvince.value) {
		try {
			const resp = await fetch(`${basePath}${GADM_FILES.ADM2}`)
			const adm2 = await resp.json()
			const items = (adm2.features || [])
				.filter(f => {
					const p = f.properties || {}
					return normalizeGADMName(p.NAME_1) === selectedProvince.value
				})
				.map(f => {
					const p = f.properties || {}
					const name = normalizeGADMName(p.NAME_2)
					return { code: name, name }
				})
				.filter(it => it.name)
			const unique = new Map(items.map(it => [it.code, it]))
			subdivisions.value = Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name))
		} catch (e) {
			console.warn('Failed to load GADM level-2 for province subdivisions:', e)
			subdivisions.value = []
		}
	} else {
		subdivisions.value = []
	}
}

async function loadRegionProvinceLists() {
	const basePath = import.meta.env.BASE_URL || '/'
	try {
		const resp = await fetch(`${basePath}${GADM_FILES.ADM1}`)
		const adm1 = await resp.json()
		const regions = new Set()
		const provinces = new Set()
		;(adm1.features || []).forEach(f => {
			const p = f.properties || {}
			if (p.NAME_0) regions.add(normalizeGADMName(p.NAME_0))
			if (p.NAME_1) provinces.add(normalizeGADMName(p.NAME_1))
		})
		availableRegions.value = Array.from(regions).sort()
		availableProvinces.value = Array.from(provinces).sort()
	} catch (e) {
		console.warn('Failed to load GADM level-1 for selector lists:', e)
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
