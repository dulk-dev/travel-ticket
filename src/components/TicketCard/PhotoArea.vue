<template>
  <div class="w-full h-full relative overflow-hidden">
    <img
      v-if="imageSrc"
      :src="imageSrc"
      class="absolute inset-0 w-full h-full object-cover"
      :style="imageStyle"
      draggable="false"
      @mousedown="onMouseDown"
      @load="onImageLoad"
      ref="imgRef"
    />
    <div
      v-else
      class="w-full h-full flex flex-col items-center justify-center"
      :class="{ 'border-2 border-dashed border-gray-300 rounded-lg': !imageSrc }"
      @dragover.prevent
      @drop="onDrop"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
const imgSize = ref({ width: 0, height: 0 })

const { transform, isDragging, onWheel, onMouseDown, onMouseMove, onMouseUp, reset } = usePhotoTransform(containerRef)

const imageStyle = computed(() => ({
  transform: `translate(${transform.value.translateX}px, ${transform.value.translateY}px) scale(${transform.value.scale})`,
  transformOrigin: 'center center',
  cursor: isDragging.value ? 'grabbing' : 'grab',
  userSelect: 'none' as const,
  transition: isDragging.value ? 'none' : 'transform 0.1s ease-out',
}))

const onImageLoad = () => {
  if (imgRef.value) {
    imgSize.value = {
      width: imgRef.value.naturalWidth,
      height: imgRef.value.naturalHeight,
    }
  }
}

const handleWheel = (e: WheelEvent) => {
  onWheel(e, imgSize.value.width, imgSize.value.height)
}

const handleMouseMove = (e: MouseEvent) => {
  onMouseMove(e, imgSize.value.width, imgSize.value.height)
}

const handleMouseUp = () => {
  onMouseUp()
}

const onDrop = (e: DragEvent) => {
  emit('drop', e)
}

watch(() => props.imageSrc, () => {
  reset()
})

// 全局事件监听
onMounted(() => {
  window.addEventListener('wheel', handleWheel, { passive: false })
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('wheel', handleWheel)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
})

import { onMounted, onBeforeUnmount } from 'vue'
</script>
