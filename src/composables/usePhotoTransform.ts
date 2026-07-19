import { ref, type Ref } from 'vue'

export interface PhotoTransform {
  scale: number
  translateX: number
  translateY: number
}

// 某一容器尺寸下的完整取景状态：变换 + 对应的铺满基准尺寸。
// 平移量是相对基准尺寸的像素值，跨容器传递时按基准尺寸比例换算即可保持取景一致。
export interface PhotoState extends PhotoTransform {
  baseWidth: number
  baseHeight: number
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

  // 图片按 object-cover 铺满取景框后的实际渲染尺寸（可能大于取景框，从而留出可拖动空间）
  const baseSize = ref({ width: 0, height: 0 })

  const setBaseSize = (width: number, height: number) => {
    baseSize.value = { width, height }
  }

  const MIN_SCALE = 1
  const MAX_SCALE = 5
  // 贴边磁吸阈值：拖拽时距离铺边/居中位置在该范围内则自动吸附
  const SNAP_THRESHOLD = 12

  const getContainerRect = () => {
    return containerRef.value?.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 }
  }

  // 单轴允许的最大偏移：基于图片铺满取景框后的实际尺寸（baseSize * scale）与取景框尺寸之差，
  // 保证图片始终铺满取景框（不露白边），同时当图片大于取景框时留出可拖动空间。
  const getMaxOffset = (baseDim: number, containerDim: number, scale: number) => {
    return Math.max(0, (baseDim * scale - containerDim) / 2)
  }

  // 磁吸：接近铺边（±maxOffset）或居中（0）位置时自动吸附，形成“贴边感”
  const snap = (value: number, maxOffset: number) => {
    if (maxOffset > 0 && Math.abs(value - maxOffset) <= SNAP_THRESHOLD) return maxOffset
    if (maxOffset > 0 && Math.abs(value + maxOffset) <= SNAP_THRESHOLD) return -maxOffset
    if (Math.abs(value) <= SNAP_THRESHOLD) return 0
    return value
  }

  const constrainTranslation = (newX: number, newY: number, scale: number, enableSnap = false) => {
    const container = getContainerRect()
    if (!container.width || !container.height) return { x: newX, y: newY }

    const maxOffsetX = getMaxOffset(baseSize.value.width, container.width, scale)
    const maxOffsetY = getMaxOffset(baseSize.value.height, container.height, scale)

    let x = Math.max(-maxOffsetX, Math.min(maxOffsetX, newX))
    let y = Math.max(-maxOffsetY, Math.min(maxOffsetY, newY))

    if (enableSnap) {
      x = snap(x, maxOffsetX)
      y = snap(y, maxOffsetY)
    }

    return { x, y }
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const container = getContainerRect()
    if (!container.width) return

    // 鼠标位置相对取景框中心（transformOrigin 为 center center）
    const mouseX = e.clientX - container.left - container.width / 2
    const mouseY = e.clientY - container.top - container.height / 2

    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, transform.value.scale * delta))
    if (newScale === transform.value.scale) return

    // 调整 translate 使鼠标指向的点在缩放前后保持不变
    const scaleRatio = newScale / transform.value.scale
    const newTranslateX = mouseX - (mouseX - transform.value.translateX) * scaleRatio
    const newTranslateY = mouseY - (mouseY - transform.value.translateY) * scaleRatio

    const constrained = constrainTranslation(newTranslateX, newTranslateY, newScale)

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

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging.value) return
    const dx = e.clientX - dragStart.value.x
    const dy = e.clientY - dragStart.value.y

    // 拖拽时启用磁吸，让贴边/居中更易对齐
    const constrained = constrainTranslation(
      transformStart.value.x + dx,
      transformStart.value.y + dy,
      transform.value.scale,
      true,
    )

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

  // 在取景框或图片基准尺寸变化后，重新约束当前位移，避免露出白边
  const reclamp = () => {
    const constrained = constrainTranslation(
      transform.value.translateX,
      transform.value.translateY,
      transform.value.scale,
    )
    transform.value = {
      ...transform.value,
      translateX: constrained.x,
      translateY: constrained.y,
    }
  }

  return {
    transform,
    isDragging,
    baseSize,
    setBaseSize,
    reclamp,
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    reset,
  }
}
