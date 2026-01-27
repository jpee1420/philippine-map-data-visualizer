<template>
  <div class="table-view">
    <div class="table-header">
      <h2>Data Table</h2>
      <div class="table-actions">
        <n-input 
          v-model:value="searchQuery" 
          placeholder="Search..." 
          size="small"
          style="width: 200px;"
        >
          <template #prefix>
            <n-icon :component="SearchIcon" />
          </template>
        </n-input>
        <n-button size="small">
          <template #icon>
            <n-icon :component="DownloadIcon" />
          </template>
          Export
        </n-button>
      </div>
    </div>
    
    <div class="table-container">
      <n-data-table
        :columns="columns"
        :data="filteredData"
        :pagination="pagination"
        :bordered="false"
        striped
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { NDataTable, NInput, NButton, NIcon } from 'naive-ui'
import { Search as SearchIcon, Download as DownloadIcon } from '@vicons/ionicons5'
import { useDataStore } from '@/store/dataStore'
import { normalizeKey } from '@/utils/nameUtils'

const dataStore = useDataStore()
const searchQuery = ref('')

const displayColumnKeys = computed(() => {
  if (dataStore.dataset.length === 0) return []

  const sample = dataStore.dataset[0]
  const keys = Object.keys(sample)

  const regionAliasKeys = new Set(['region', 'regionname', 'reg'])
  const provinceAliasKeys = new Set(['province', 'provincename', 'prov'])
  const cityAliasKeys = new Set([
    'city',
    'cityname',
    'municipality',
    'municipal',
    'municipalname',
    'municipalitycity',
    'cities',
    'municipalities',
    'citymunicipality',
    'citiesmunicipalities',
    'citymunicipalityname',
    'citiesandmunicipalities',
    'cityandmunicipality',
    'citymunicipal',
    'mun',
    'municity'
  ])

  const hasRegionAlias = keys.some(k => k !== 'region' && regionAliasKeys.has(normalizeKey(k)))
  const hasProvinceAlias = keys.some(k => k !== 'province' && provinceAliasKeys.has(normalizeKey(k)))
  const hasCityAlias = keys.some(k => k !== 'city' && cityAliasKeys.has(normalizeKey(k)))

  return keys.filter(k => {
    const nk = normalizeKey(k)
    if (k === 'region' && hasRegionAlias && regionAliasKeys.has(nk)) return false
    if (k === 'province' && hasProvinceAlias && provinceAliasKeys.has(nk)) return false
    if (k === 'city' && hasCityAlias && cityAliasKeys.has(nk)) return false
    return true
  })
})

const columns = computed(() => {
  const keys = displayColumnKeys.value
  return keys.map(key => ({
    title: key,
    key,
    sorter: 'default'
  }))
})

const filteredData = computed(() => {
  let data = dataStore.filteredData
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    data = data.filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(query)
      )
    )
  }
  
  return data
})

const pagination = {
  pageSize: 20,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100]
}
</script>

<style scoped>
.table-view {
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
}

.table-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.table-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.table-container {
  flex: 1;
  overflow: auto;
  padding: 20px;
}
</style>
