import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const dataDir = path.join(projectRoot, 'public', 'data')

const args = process.argv.slice(2)
const IN_PLACE = args.includes('--in-place') || args.includes('-i')

function normalize(s) {
  // Lowercase, strip non-letters, then strip common admin words
  const onlyLetters = String(s || '').toLowerCase().replace(/[^a-z]/g, '')
  return onlyLetters
    .replace(/region/g, '')
    .replace(/province/g, '')
    .replace(/cityof/g, '')
    .replace(/city/g, '')
    .replace(/municipalityof/g, '')
    .replace(/municipality/g, '')
}

function getFeatureName(f) {
  const p = f.properties || {}
  return (
    p.shapeName || p.shapeGroup || p.shapeID || p.name || p.region || p.province || p.city || ''
  )
}

async function loadJSON(file) {
  const content = await fs.readFile(file, 'utf8')
  return JSON.parse(content)
}

async function writeJSON(file, data) {
  const content = JSON.stringify(data, null, 2)
  await fs.writeFile(file, content, 'utf8')
}

function buildRegionIndex(rows) {
  const idx = new Map()
  for (const r of rows) {
    const keys = [r.name, r.regionName].filter(Boolean)
    for (const k of keys) {
      const nk = normalize(k)
      if (nk && !idx.has(nk)) idx.set(nk, { psgc10: r.psgc10DigitCode, code: r.code })
    }
  }
  return idx
}

function buildProvinceIndex(rows) {
  const idx = new Map()
  for (const r of rows) {
    const nk = normalize(r.name)
    if (nk && !idx.has(nk)) idx.set(nk, { psgc10: r.psgc10DigitCode, code: r.code })
  }
  return idx
}

function buildMuniCityIndex(rows, provinces) {
  const idx = new Map()
  const provByCode = new Map()
  for (const p of provinces) {
    provByCode.set(p.code, normalize(p.name))
  }
  for (const r of rows) {
    const muniNk = normalize(r.name)
    const provNk = provByCode.get(r.provinceCode) || ''
    const combined = `${muniNk}|${provNk}`
    // Use combined key to avoid collisions across provinces
    if (muniNk && !idx.has(combined)) idx.set(combined, { psgc10: r.psgc10DigitCode, code: r.code })
    // Also store name-only fallback if unique
    if (muniNk && !idx.has(muniNk)) idx.set(muniNk, { psgc10: r.psgc10DigitCode, code: r.code })
  }
  return idx
}

async function annotateFile(geoFile, index, label) {
  const fullPath = path.join(dataDir, geoFile)
  const geo = await loadJSON(fullPath)

  let matches = 0
  let misses = 0

  for (const f of geo.features || []) {
    const name = getFeatureName(f)
    const nk = normalize(name)
    let m = index.get(nk)
    // For ADM3, try matching with parent province context first
    if (!m && label === 'ADM3') {
      const p = f.properties || {}
      const parentName = p.shapeGroup || p.province || ''
      const parentNk = normalize(parentName)
      const combined = `${nk}|${parentNk}`
      m = index.get(combined) || m
    }
    if (m) {
      f.properties = f.properties || {}
      f.properties.psgc10DigitCode = m.psgc10
      f.properties.psgcCode = m.code
      matches++
    } else {
      misses++
    }
  }

  const outPath = IN_PLACE
    ? fullPath
    : path.join(
        dataDir,
        geoFile.replace(/\.geojson$/i, '_with_psgc.geojson')
      )

  await writeJSON(outPath, geo)

  console.log(
    `${label}: wrote ${IN_PLACE ? 'in place' : outPath}. Matches: ${matches}, Misses: ${misses}`
  )

  if (!IN_PLACE && outPath === fullPath) {
    console.warn('Output path equals input; check filename logic.')
  }
}

async function main() {
  try {
    const regionsPath = path.join(dataDir, 'regions.json')
    const provincesPath = path.join(dataDir, 'provinces.json')
    const municitiesPath = path.join(dataDir, 'municities.json')

    const [regions, provinces, municities] = await Promise.all([
      loadJSON(regionsPath),
      loadJSON(provincesPath),
      loadJSON(municitiesPath)
    ])

    const regionIdx = buildRegionIndex(regions)
    const provinceIdx = buildProvinceIndex(provinces)
    const muniCityIdx = buildMuniCityIndex(municities, provinces)

    await annotateFile('geoBoundaries-PHL-ADM1_simplified.geojson', regionIdx, 'ADM1')
    await annotateFile('geoBoundaries-PHL-ADM2_simplified.geojson', provinceIdx, 'ADM2')
    await annotateFile('geoBoundaries-PHL-ADM3_simplified.geojson', muniCityIdx, 'ADM3')

    console.log('Done.')
  } catch (err) {
    console.error('Error annotating PSGC codes:', err)
    process.exit(1)
  }
}

main()
