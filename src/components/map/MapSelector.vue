<template>
  <div class="map-selector">
    <n-card size="small" title="Map View">
      <n-space vertical>
        <!-- Map Level Selection -->
        <div class="selector-group">
          <n-text strong>View Level</n-text>
          <n-radio-group v-model:value="selectedLevel" @update:value="handleLevelChange">
            <n-space vertical>
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
              v-if="subdivisions.length > 0"
              :checked="areAllSubdivisionsSelected"
              @update:checked="toggleSelectAll"
            >
              Select all
            </n-checkbox>
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
              v-if="subdivisions.length > 0"
              :checked="areAllSubdivisionsSelected"
              @update:checked="toggleSelectAll"
            >
              Select all
            </n-checkbox>
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
      </n-space>
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { NCard, NSpace, NText, NRadioGroup, NRadio, NSelect, NCheckbox } from 'naive-ui'
import { useDataStore } from '@/store/dataStore'
import { normalizeLocationName } from '@/utils/nameUtils'
import { BOUNDARY_PATHS, NCR_REGION_NAME } from '@/config/mapConfig'

const dataStore = useDataStore()

const selectedLevel = ref('regions')
const selectedRegion = ref(null)
const selectedProvince = ref(null)

// Available locations from GeoJSON
const availableRegions = ref([])
const availableProvinces = ref([])

// Subdivisions within current focus
const subdivisions = ref([])
const selectedSubdivisionSet = ref(new Set())

const areAllSubdivisionsSelected = computed(() => {
  if (!subdivisions.value.length) return false
  return subdivisions.value.every(it =>
    selectedSubdivisionSet.value.has(String(it.code))
  )
})

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

function handleLevelChange(level) {
  selectedRegion.value = null
  selectedProvince.value = null
  
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

function isSubdivisionChecked(item) {
  return selectedSubdivisionSet.value.has(String(item))
}

function toggleSubdivision(item, checked) {
  const key = String(item)
  if (checked) selectedSubdivisionSet.value.add(key)
  else selectedSubdivisionSet.value.delete(key)
  dataStore.setSelectedSubdivisions(Array.from(selectedSubdivisionSet.value))
}

function toggleSelectAll(checked) {
  if (checked) {
    selectedSubdivisionSet.value = new Set(
      subdivisions.value.map(it => String(it.code))
    )
  } else {
    selectedSubdivisionSet.value = new Set()
  }
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
			// NCR: treat its cities/municipalities as subdivisions
			try {
				const resp = await fetch(`${basePath}${BOUNDARY_PATHS.cities}`)
				const adm3 = await resp.json()
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
				selectedSubdivisionSet.value = new Set(subdivisions.value.map(it => String(it.code)))
				dataStore.setSelectedSubdivisions(Array.from(selectedSubdivisionSet.value))
			} catch (e) {
				console.warn('Failed to load ADM3 for NCR city/municipality subdivisions:', e)
				subdivisions.value = []
			}
		} else {
			// Non-NCR regions: subdivisions are provinces (ADM2)
			try {
				const resp = await fetch(`${basePath}${BOUNDARY_PATHS.provinces}`)
				const adm2 = await resp.json()
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
				selectedSubdivisionSet.value = new Set(subdivisions.value.map(it => String(it.code)))
				dataStore.setSelectedSubdivisions(Array.from(selectedSubdivisionSet.value))
			} catch (e) {
				console.warn('Failed to load ADM2 for region subdivisions:', e)
				subdivisions.value = []
			}
		}
	} else if (selectedLevel.value === 'provinces' && selectedProvince.value) {
		try {
			const provResp = await fetch(`${basePath}${BOUNDARY_PATHS.provinces}`)
			const adm2Provinces = await provResp.json()
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
			const resp = await fetch(`${basePath}${BOUNDARY_PATHS.cities}`)
			const adm3 = await resp.json()
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
			selectedSubdivisionSet.value = new Set(subdivisions.value.map(it => String(it.code)))
			dataStore.setSelectedSubdivisions(Array.from(selectedSubdivisionSet.value))
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
		const resp = await fetch(`${basePath}${BOUNDARY_PATHS.provinces}`)
		const adm2 = await resp.json()
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
  display: flex;
  align-items: center;
  gap: 6px;
}

.checkbox-list :deep(.n-checkbox .n-checkbox__label) {
  white-space: normal;
}
</style>
