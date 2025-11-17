export const MAP_LEVELS = ['country', 'regions', 'provinces']

const GADM_BASE = 'data'

// Raw GADM file locations (relative to public/)
export const GADM_FILES = {
  ADM0: `${GADM_BASE}/gadm41_PHL_0.json`,
  ADM1: `${GADM_BASE}/gadm41_PHL_2.json`,
  ADM2: `${GADM_BASE}/gadm41_PHL_2.json`,
  ADM3: `${GADM_BASE}/gadm41_PHL_3.json`,
  // ADM4: `${`
}

// Logical map-level paths used by the app
export const GADM_PATHS = {
  country: GADM_FILES.ADM0,
  regions: GADM_FILES.ADM1,
  provinces: GADM_FILES.ADM2
} 

export const NCR_REGION_NAME = 'National Capital Region'
export const NCR_PARENT_NAME = 'MetropolitanManila'
