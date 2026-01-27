import L from 'leaflet'
import { forceSimulation, forceCollide, forceX, forceY } from 'd3-force'

const COLLISION_RADIUS_PX = 50

const BASE_CALLOUT_WIDTH = 120
const BASE_CALLOUT_HEIGHT = 50
const BASE_MARKER_RADIUS = 4
const BASE_FONT_SIZE = 1
const REFERENCE_ZOOM = 8

export function getZoomResponsiveSize(zoom) {
  const scaleFactor = Math.max(0.5, Math.min(1.6, REFERENCE_ZOOM / zoom))

  return {
    width: Math.round(BASE_CALLOUT_WIDTH * scaleFactor),
    height: Math.round(BASE_CALLOUT_HEIGHT * scaleFactor),
    fontSize: BASE_FONT_SIZE * scaleFactor,
    markerRadius: Math.max(2, Math.round(BASE_MARKER_RADIUS * scaleFactor))
  }
}

function applyCollisionAvoidance(mapInstance, locations, options = {}) {
  if (!mapInstance || !locations || locations.length === 0) {
    return Array.isArray(locations) ? locations.map(loc => loc.center) : []
  }

  const {
    collisionRadius = COLLISION_RADIUS_PX,
    iterations = 150,
    strength = 0.5
  } = options

  const nodes = locations.map((location, index) => {
    const center = location.center
    const anchor = L.latLng(center[0], center[1])
    const point = mapInstance.latLngToLayerPoint(anchor)

    return {
      id: location.name || `node-${index}`,
      index,
      anchor,
      xOriginal: point.x,
      yOriginal: point.y,
      x: point.x,
      y: point.y
    }
  })

  const mapSize = mapInstance.getSize()
  const padding = collisionRadius
  const minX = padding
  const maxX = mapSize.x - padding
  const minY = padding
  const maxY = mapSize.y - padding

  const simulation = forceSimulation(nodes)
    .force(
      'collide',
      forceCollide().radius(collisionRadius).strength(0.8).iterations(3)
    )
    .force('x', forceX(d => d.xOriginal).strength(strength))
    .force('y', forceY(d => d.yOriginal).strength(strength))
    .stop()

  for (let i = 0; i < iterations; i++) {
    simulation.tick()

    nodes.forEach(node => {
      node.x = Math.max(minX, Math.min(maxX, node.x))
      node.y = Math.max(minY, Math.min(maxY, node.y))
    })
  }

  return nodes.map(node => {
    const constrainedX = Math.max(minX, Math.min(maxX, node.x))
    const constrainedY = Math.max(minY, Math.min(maxY, node.y))
    const adjustedPoint = L.point(constrainedX, constrainedY)
    const adjustedLatLng = mapInstance.layerPointToLatLng(adjustedPoint)
    return [adjustedLatLng.lat, adjustedLatLng.lng]
  })
}

export function calculateLabelPositions(mapInstance, locations, zoom) {
  const baseRadius = COLLISION_RADIUS_PX
  const zoomFactor = Math.max(0.5, Math.min(1.5, zoom / 8))
  const adjustedRadius = baseRadius / zoomFactor

  return applyCollisionAvoidance(mapInstance, locations, {
    collisionRadius: adjustedRadius,
    iterations: 150,
    strength: 0.4
  })
}
