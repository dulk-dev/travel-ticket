import { ref, type Ref } from 'vue'

export interface PhotoTransform {
  scale: number
  translateX: number
  translateY: number
}

export function usePhotoTransform(containerRef: Ref<HTMLElement | null>) {
  const transform = ref<PhotoTransform>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  })

  const isDragging = ref(false)
  const dragStart = ref({ x: 0, y: 0 })
  const transformStart = ref({ x: 0, y: 0 })

  const MIN_SCALE = 1
  const MAX_SCALE = 5

  const getContainerRect = () => {
    return containerRef.value?.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 }
  }

  const constrainTranslation = (newX: number, newY: number, scale: number, imgWidth: number, imgHeight: number) => {
    const container = getContainerRect()
    if (!container.width || !container.height) return { x: newX, y: newY }

    const scaledWidth = imgWidth * scale
    const scaledHeight = imgHeight * scale

    // 至少保留 10% 内容在取景框内
    const minVisible = 0.1
    const maxOffsetX = Math.max(0, (scaledWidth - container.width) / 2 + container.width * minVisible)
    const maxOffsetY = Math.max(0, (scaledHeight - container.height) / 2 + container.height * minVisible)

    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, newX)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, newY)),
    }
  }

  const onWheel = (e: WheelEvent, imgWidth: number, imgHeight: number) => {
    e.preventDefault()
    const container = getContainerRect()
    if (!container.width) return

    // 以鼠标位置为中心缩放
    const mouseX = e.clientX - container.left
    const mouseY = e.clientY - container.top

    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, transform.value.scale * delta))

    // 调整 translate 使鼠标指向的点保持不变
    const scaleRatio = newScale / transform.value.scale
    const newTranslateX = mouseX - (mouseX - transform.value.translateX) * scaleRatio
    const newTranslateY = mouseY - (mouseY - transform.value.translateY) * scaleRatio

    const constrained = constrainTranslation(newTranslateX, newTranslateY, newScale, imgWidth, imgHeight)

    transform.value = {
      scale: newScale,
      translateX: constrained.x,
      translateY: constrained.y,
    }
  }

  const onMouseDown = (e: MouseEvent) => {
    isDragging.value = true
    dragStart.value = { x: e.clientX, y: e.clientY }
    transformStart.value = { x: transform.value.translateX, y: transform.value.translateY }
  }

  const onMouseMove = (e: MouseEvent, imgWidth: number, imgHeight: number) => {
    if (!isDragging.value) return
    const dx = e.clientX - dragStart.value.x
    const dy = e.clientY - dragStart.value.y

    const newX = transformStart.value.x + dx
    const newY = transformStart.value.y + dy

    const constrained = constrainTranslation(newX, newY, transform.value.scale, imgWidth, imgHeight)

    transform.value = {
      ...transform.value,
      translateX: constrained.x,
      translateY: constrained.y,
    }
  }

  const onMouseUp = () => {
    isDragging.value = false
  }

  const reset = () => {
    transform.value = { scale: 1, translateX: 0, translateY: 0 }
  }

  return {
    transform,
    isDragging,
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    reset,
  }
}
