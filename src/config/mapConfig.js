export const MAP_LEVELS = ['regions', 'provinces']

// Root folder (under /public) where GADM JSON files live.
// If you move them into /public/data/gadm, change this to 'data/gadm'.
export const BOUNDARY_BASE = 'data'

export const BOUNDARY_PATHS = {
  country: `${BOUNDARY_BASE}/phl_admbnda_adm0_singlepart_psa_namria_20231106.json`,
  regions: `${BOUNDARY_BASE}/phl_admbnda_adm1_psa_namria_20231106.json`,
  // We currently use GADM level-1 for both regions and provinces.
  provinces: `${BOUNDARY_BASE}/phl_admbnda_adm2_psa_namria_20231106.json`,
  // ADM2: cities/municipalities, used for subdivisions (NCR cities, province cities).
  cities: `${BOUNDARY_BASE}/phl_admbnda_adm3_psa_namria_20231106.json`
}

export const NCR_REGION_NAME = 'National Capital Region'
