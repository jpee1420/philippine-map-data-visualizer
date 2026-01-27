import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Composable for handling resizable panel logic
 * @param {Object} options - Configuration options
 * @param {number} options.initialWidth - Initial panel width in pixels
 * @param {number} options.minWidth - Minimum allowed width
 * @param {number} options.maxWidth - Maximum allowed width
 * @param {string} options.side - 'left' or 'right' panel
 * @param {Function} options.onResizeEnd - Callback when resize ends
 */
export function useResizablePanel(options = {}) {
  const {
    initialWidth = 240,
    minWidth = 200,
    maxWidth = 400,
    side = 'left',
    onResizeEnd = null
  } = options

  const panelWidth = ref(initialWidth)
  const isCollapsed = ref(false)
  const isResizing = ref(false)

  const startResize = () => {
    isResizing.value = true
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }

  const handleMouseMove = (e) => {
    if (!isResizing.value) return

    let newWidth
    if (side === 'left') {
      newWidth = e.clientX
    } else {
      newWidth = window.innerWidth - e.clientX
    }

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      panelWidth.value = newWidth
    }
  }

  const stopResize = () => {
    if (!isResizing.value) return
    
    isResizing.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    if (onResizeEnd && typeof onResizeEnd === 'function') {
      onResizeEnd()
    }
  }

  const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value
  }

  onMounted(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopResize)
  })

  onUnmounted(() => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', stopResize)
  })

  return {
    panelWidth,
    isCollapsed,
    isResizing,
    startResize,
    toggleCollapse
  }
}
