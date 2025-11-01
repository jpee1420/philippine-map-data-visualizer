<template>
  <div class="data-uploader">
    <n-card title="Import Data" size="small">
      <n-tabs type="line" animated>
        <!-- File Upload Tab -->
        <n-tab-pane name="file" tab="Upload File">
          <n-upload
            :custom-request="handleFileUpload"
            :show-file-list="true"
            accept=".csv,.xlsx,.xls,.json"
            :max="1"
          >
            <n-button>
              📁 Select File
            </n-button>
          </n-upload>
          <n-text depth="3" style="display: block; margin-top: 8px; font-size: 12px;">
            Supported formats: CSV, Excel (.xlsx, .xls), JSON
          </n-text>
        </n-tab-pane>
        
        <!-- Google Sheets Tab -->
        <n-tab-pane name="sheets" tab="Google Sheets">
          <n-space vertical>
            <n-input
              v-model:value="sheetsUrl"
              placeholder="Enter Google Sheets URL"
              clearable
            />
            <n-button type="primary" @click="handleGoogleSheets" :loading="loading">
              Import from Google Sheets
            </n-button>
            <n-text depth="3" style="font-size: 12px;">
              Make sure the sheet is publicly accessible
            </n-text>
          </n-space>
        </n-tab-pane>
        
        <!-- Sample Data Tab -->
        <n-tab-pane name="sample" tab="Sample Data">
          <n-space vertical>
            <n-text>Load sample Philippine regional data for testing</n-text>
            <n-button type="success" @click="loadSampleData">
              Load Sample Data
            </n-button>
          </n-space>
        </n-tab-pane>
      </n-tabs>
      
      <!-- Status Messages -->
      <n-alert 
        v-if="successMessage" 
        type="success" 
        style="margin-top: 16px;"
        closable
        @close="successMessage = ''"
      >
        {{ successMessage }}
      </n-alert>
      
      <n-alert 
        v-if="errorMessage" 
        type="error" 
        style="margin-top: 16px;"
        closable
        @close="errorMessage = ''"
      >
        {{ errorMessage }}
      </n-alert>
    </n-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { 
  NCard, NTabs, NTabPane, NUpload, NButton, NInput, 
  NSpace, NText, NAlert
} from 'naive-ui'
import { useDataStore } from '@/store/dataStore'
import { parseFile, importFromGoogleSheets, validateData } from '@/utils/dataParser'

const dataStore = useDataStore()
const sheetsUrl = ref('')
const loading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

async function handleFileUpload({ file, onFinish, onError }) {
  try {
    loading.value = true
    errorMessage.value = ''
    
    const data = await parseFile(file.file)
    validateData(data)
    
    dataStore.setDataset(data)
    successMessage.value = `Successfully imported ${data.length} rows`
    
    onFinish()
  } catch (error) {
    errorMessage.value = error.message
    onError()
  } finally {
    loading.value = false
  }
}

async function handleGoogleSheets() {
  if (!sheetsUrl.value) {
    errorMessage.value = 'Please enter a Google Sheets URL'
    return
  }
  
  try {
    loading.value = true
    errorMessage.value = ''
    
    const data = await importFromGoogleSheets(sheetsUrl.value)
    validateData(data)
    
    dataStore.setDataset(data)
    successMessage.value = `Successfully imported ${data.length} rows from Google Sheets`
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

async function loadSampleData() {
  try {
    loading.value = true
    errorMessage.value = ''
    
    // Load the sample CSV file
    const response = await fetch('/data/sample-data.csv')
    const csvText = await response.text()
    
    // Parse the CSV
    const data = await parseFile({ file: new File([csvText], 'sample-data.csv', { type: 'text/csv' }) })
    validateData(data)
    
    dataStore.setDataset(data)
    successMessage.value = `Loaded ${data.length} sample records from Philippine cities`
  } catch (error) {
    errorMessage.value = 'Failed to load sample data: ' + error.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.data-uploader {
  margin-bottom: 16px;
}
</style>
