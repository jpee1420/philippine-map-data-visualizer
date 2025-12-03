import Papa from 'papaparse'
import * as XLSX from 'xlsx'

/**
 * Parse CSV file to JSON
 */
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      worker: true,
      complete: (results) => {
        resolve(results.data)
      },
      error: (error) => {
        reject(error)
      }
    })
  })
}

/**
 * Parse Excel file to JSON
 */
export function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        resolve(jsonData)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = (error) => {
      reject(error)
    }
    
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Parse JSON file
 */
export function parseJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result)
        resolve(Array.isArray(jsonData) ? jsonData : [jsonData])
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = (error) => {
      reject(error)
    }
    
    reader.readAsText(file)
  })
}

/**
 * Import from Google Sheets (public CSV URL)
 */
export async function importFromGoogleSheets(sheetUrl) {
  try {
    // Convert Google Sheets URL to CSV export URL
    let csvUrl = sheetUrl
    
    if (sheetUrl.includes('/edit')) {
      csvUrl = sheetUrl.replace('/edit#gid=', '/export?format=csv&gid=')
      csvUrl = csvUrl.replace('/edit?usp=sharing', '/export?format=csv')
    }
    
    const response = await fetch(csvUrl)
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
    }
    const csvText = await response.text()
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data)
        },
        error: (error) => {
          reject(error)
        }
      })
    })
  } catch (error) {
    throw new Error(`Failed to import from Google Sheets: ${error.message}`)
  }
}

/**
 * Parse file based on extension
 */
export async function parseFile(file) {
  const extension = file.name.split('.').pop().toLowerCase()
  
  switch (extension) {
    case 'csv':
      return parseCSV(file)
    case 'xlsx':
    case 'xls':
      return parseExcel(file)
    case 'json':
      return parseJSON(file)
    default:
      throw new Error(`Unsupported file format: ${extension}`)
  }
}

/**
 * Validate data structure
 */
export function validateData(data) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Data must be a non-empty array')
  }
  
  const firstRow = data[0]
  const hasGeoColumns = 'region' in firstRow || 'province' in firstRow || 'city' in firstRow
  
  if (!hasGeoColumns) {
    console.warn('Warning: No geographic columns found (region, province, city)')
  }
  
  return true
}
