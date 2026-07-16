<template>
  <div class="w-full h-full relative overflow-hidden" ref="containerRef">
    <img
      v-if="imageSrc"
      ref="imgRef"
      :src="imageSrc"
      class="absolute"
      :style="imageStyle"
      draggable="false"
      @mousedown="onMouseDown"
      @load="onImageLoad"
    />
    <div
      v-else
      class="w-full h-full flex flex-col items-center justify-center"
      :class="{ 'rounded-lg': !imageSrc }"
      @dragover.prevent
      @drop="onDrop"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { usePhotoTransform } from '@/composables/usePhotoTransform'

interface Props {
  imageSrc: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'drop', event: DragEvent): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)
const naturalSize = ref({ width: 0, height: 0 })

const { transform, isDragging, baseSize, setBaseSize, reclamp, onWheel, onMouseDown, onMouseMove, onMouseUp, reset } =
  usePhotoTransform(containerRef)

const imageStyle = computed(() => ({
  position: 'absolute' as const,
  inset: '0',
  margin: 'auto',
  width: baseSize.value.width ? `${baseSize.value.width}px` : '100%',
  height: baseSize.value.height ? `${baseSize.value.height}px` : '100%',
  maxWidth: 'none' as const,
  transform: `translate(${transform.value.translateX}px, ${transform.value.translateY}px) scale(${transform.value.scale})`,
  transformOrigin: 'center center',
  cursor: isDragging.value ? 'grabbing' : 'grab',
  userSelect: 'none' as const,
  transition: isDragging.value ? 'none' : 'transform 0.1s ease-out',
}))

// 计算图片铺满取景框（object-cover）后的实际渲染尺寸，使大图在 scale 1 时也可拖动
const computeBaseSize = () => {
  const container = containerRef.value?.getBoundingClientRect()
  const nw = naturalSize.value.width
  const nh = naturalSize.value.height
  if (!container || !container.width || !container.height || !nw || !nh) return
  const baseScale = Math.max(container.width / nw, container.height / nh)
  setBaseSize(nw * baseScale, nh * baseScale)
  reclamp()
}

const onImageLoad = () => {
  if (!imgRef.value) return
  naturalSize.value = { width: imgRef.value.naturalWidth, height: imgRef.value.naturalHeight }
  computeBaseSize()
}

// 仅当存在图片时，监听编辑区域内的滚轮进行缩放
const handleWheel = (e: WheelEvent) => {
  if (!props.imageSrc) return
  onWheel(e)
}

const onDrop = (e: DragEvent) => {
  emit('drop', e)
}

watch(
  () => props.imageSrc,
  () => {
    reset()
  },
)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  // 滚轮监听绑定在编辑区域（取景框）上，避免劫持页面其他区域的滚动
  containerRef.value?.addEventListener('wheel', handleWheel, { passive: false })
  // 拖拽移动/释放绑定在 window，保证鼠标移出取景框时仍可持续拖拽
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  // 取景框尺寸变化时重算图片铺满尺寸（响应式布局）
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => computeBaseSize())
    resizeObserver.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  containerRef.value?.removeEventListener('wheel', handleWheel)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  resizeObserver?.disconnect()
})
</script>
