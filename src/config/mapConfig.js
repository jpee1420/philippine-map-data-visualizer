export const MAP_LEVELS = ['country', 'regions', 'provinces']

// Root folder (under /public) where GADM JSON files live.
// If you move them into /public/data/gadm, change this to 'data/gadm'.
export const GADM_BASE = 'data'

export const GADM_PATHS = {
  country: `${GADM_BASE}/gadm41_PHL_0.json`,
  regions: `${GADM_BASE}/gadm41_PHL_1.json`,
  // We currently use GADM level-1 for both regions and provinces.
  provinces: `${GADM_BASE}/gadm41_PHL_2.json`,
  // ADM2: cities/municipalities, used for subdivisions (NCR cities, province cities).
  cities: `${GADM_BASE}/gadm41_PHL_3.json`
}

export const NCR_REGION_NAME = 'National Capital Region'
export const NCR_PARENT_NAME = 'MetropolitanManila'
