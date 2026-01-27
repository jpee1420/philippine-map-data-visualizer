<template>
  <div class="data-uploader">
    <n-card title="Import Data" size="small">
      <n-tabs type="line" animated>
        <n-tab-pane name="file" tab="Upload File">
          <n-upload
            :custom-request="handleFileUpload"
            :show-file-list="true"
            accept=".csv,.xlsx,.xls,.json"
            :max="1"
            :on-remove="handleFileRemove"
          >
            <n-button>
              📁 Select File
            </n-button>
          </n-upload>
          <n-text depth="3" style="display: block; margin-top: 8px; font-size: 12px;">
            Supported formats: CSV, Excel (.xlsx, .xls), JSON
          </n-text>
        </n-tab-pane>
        
        <n-tab-pane name="sheets" tab="Google Sheets">
          <n-space vertical>
            <n-input
              v-model:value="sheetsUrl"
              placeholder="Enter Google Sheets URL"
              clearable
            />
            <n-button type="primary" @click="handleGoogleSheets" :loading="isLoading">
              Import from Google Sheets
            </n-button>
            <n-text depth="3" style="font-size: 12px;">
              Make sure the sheet is publicly accessible
            </n-text>
          </n-space>
        </n-tab-pane>
      </n-tabs>
      
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
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

async function handleFileUpload({ file, onFinish, onError }) {
  try {
    isLoading.value = true
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
    isLoading.value = false
  }
}

function handleFileRemove() {
  dataStore.clearDataset()
  successMessage.value = ''
  errorMessage.value = ''
}

async function handleGoogleSheets() {
  if (!sheetsUrl.value) {
    errorMessage.value = 'Please enter a Google Sheets URL'
    return
  }
  
  try {
    isLoading.value = true
    errorMessage.value = ''
    
    const data = await importFromGoogleSheets(sheetsUrl.value)
    validateData(data)
    
    dataStore.setDataset(data)
    successMessage.value = `Successfully imported ${data.length} rows from Google Sheets`
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.data-uploader {
  margin-bottom: 16px;
}
</style>
