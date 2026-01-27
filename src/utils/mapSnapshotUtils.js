import html2canvas from 'html2canvas'

export async function saveElementAsTransparentPng(element, options = {}) {
  if (!element) return

  const {
    fileName = 'map-snapshot.png',
    controlSelectors = '.leaflet-control-container, .leaflet-control-zoom, .leaflet-control-attribution',
    scale = window.devicePixelRatio || 2
  } = options

  const previousBackground = element.style.background
  const hiddenControls = []

  try {
    element.style.background = 'transparent'

    const controls = element.querySelectorAll(controlSelectors)
    controls.forEach((ctrl) => {
      hiddenControls.push({ el: ctrl, display: ctrl.style.display })
      ctrl.style.display = 'none'
    })

    const canvas = await html2canvas(element, {
      backgroundColor: null,
      useCORS: true,
      logging: false,
      scale
    })

    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = fileName
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } finally {
    hiddenControls.forEach(({ el, display }) => {
      el.style.display = display
    })
    element.style.background = previousBackground
  }
}
