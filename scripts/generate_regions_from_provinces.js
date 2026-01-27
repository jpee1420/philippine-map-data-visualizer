import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import union from '@turf/union'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const dataDir = path.join(projectRoot, 'public', 'data')

async function loadJSON(filePath) {
  const content = await fs.readFile(filePath, 'utf8')
  return JSON.parse(content)
}

async function writeJSON(filePath, data) {
  const content = JSON.stringify(data, null, 2)
  await fs.writeFile(filePath, content, 'utf8')
}

async function main() {
  const srcPath = path.join(dataDir, 'gadm41_PHL_1.json')
  const outPath = path.join(dataDir, 'gadm41_PHL_1.1.json')

  console.log('Reading provinces file:', srcPath)
  const src = await loadJSON(srcPath)

  const features = Array.isArray(src.features) ? src.features : []
  console.log('Input ADM1 features (provinces):', features.length)

  // Group province features by their region name (NAME_0)
  const regionGroups = new Map()

  for (const feature of features) {
    if (!feature || !feature.properties) continue
    const props = feature.properties
    // In this GADM ADM1 file, NAME_0 holds the region name (e.g. "Cordillera Administrative Region (CAR)")
    const regionName = props.NAME_0 || props.COUNTRY || 'Unknown'

    if (!regionGroups.has(regionName)) {
      regionGroups.set(regionName, [])
    }
    regionGroups.get(regionName).push(feature)
  }

  console.log('Region groups found:', regionGroups.size)

  const regionFeatures = []

  for (const [regionName, group] of regionGroups.entries()) {
    let merged = null

    for (const feature of group) {
      const geom = feature.geometry
      if (!geom || !geom.type || !geom.coordinates) continue

      const asFeature = {
        type: 'Feature',
        properties: {},
        geometry: geom
      }

      if (!merged) {
        merged = asFeature
      } else {
        try {
          const u = union(merged, asFeature)
          if (u && u.geometry) {
            merged = u
          }
        } catch (e) {
          console.warn('Union failed for region', regionName, '- keeping partial geometry:', e.message)
        }
      }
    }

    if (!merged || !merged.geometry) {
      console.warn('No geometry collected for region:', regionName)
      continue
    }

    // Use the first province's properties as a base, but override names to represent the region
    const baseProps = group[0].properties || {}
    const regionProps = {
      ...baseProps,
      // Keep country / GID_0 etc. from base, but make names clearly region-level
      NAME_0: regionName,
      NAME_1: regionName,
      ENGTYPE_1: 'Region'
    }

    const regionFeature = {
      type: 'Feature',
      properties: regionProps,
      geometry: merged.geometry
    }

    regionFeatures.push(regionFeature)
  }

  console.log('Generated region features:', regionFeatures.length)

  const out = {
    ...src,
    name: 'gadm41_PHL_1_regions_from_provinces',
    features: regionFeatures
  }

  console.log('Writing region-level file:', outPath)
  await writeJSON(outPath, out)
  console.log('Done. Output written to', outPath)
}

main().catch(err => {
  console.error('Failed to generate region boundaries from provinces:', err)
  process.exit(1)
})
