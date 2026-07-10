<template>
  <div
    ref="ticketRef"
    class="relative flex overflow-hidden shadow-2xl"
    :style="ticketStyle"
  >
    <!-- 左侧照片区 -->
    <div
      ref="photoContainerRef"
      class="relative overflow-hidden"
      :style="{ width: photoWidth, height: '100%' }"
    >
      <PhotoArea
        :image-src="imageSrc"
        @drop="handleDrop"
      >
        <UploadButton @upload="handleUpload" />
      </PhotoArea>
    </div>

    <!-- 分隔线 -->
    <div class="w-px shrink-0" :style="{ backgroundColor: dividerColor }"></div>

    <!-- 右侧信息区 -->
    <div class="flex-1" :style="{ backgroundColor: infoBgColor }">
      <InfoArea :info="info" :text-color="textColor">
        <template #barcode>
          <Barcode :value="info.code" :color="textColor" />
        </template>
      </InfoArea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import PhotoArea from './PhotoArea.vue'
import InfoArea from './InfoArea.vue'
import UploadButton from '@/components/UploadButton/index.vue'
import Barcode from '@/components/Barcode/index.vue'
import type { TicketInfo } from '@/composables/useMockData'

interface Props {
  imageSrc: string
  info: TicketInfo
  primaryColor: string
  photoWidth?: string
}

const props = withDefaults(defineProps<Props>(), {
  photoWidth: '55%',
})

const emit = defineEmits<{
  (e: 'upload', event: Event): void
  (e: 'drop', event: DragEvent): void
}>()

const ticketRef = ref<HTMLElement | null>(null)
const photoContainerRef = ref<HTMLElement | null>(null)

const ticketStyle = computed(() => ({
  backgroundColor: props.primaryColor,
  aspectRatio: '2 / 1',
  maxWidth: '800px',
  width: '100%',
  borderRadius: '16px',
}))

const infoBgColor = computed(() => {
  // 票根区域比背景板稍浅
  const hex = props.primaryColor.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  // 提亮 15%
  const lighten = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.15))
  return `#${[lighten(r), lighten(g), lighten(b)].map(c => c.toString(16).padStart(2, '0')).join('')}`
})

const textColor = computed(() => {
  // 根据背景亮度决定文字颜色
  const hex = props.primaryColor.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128 ? '#2C2C2C' : '#F5F0EB'
})

const dividerColor = computed(() => {
  return textColor.value === '#2C2C2C' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)'
})

const handleUpload = (e: Event) => {
  emit('upload', e)
}

const handleDrop = (e: DragEvent) => {
  emit('drop', e)
}

const getTicketElement = () => ticketRef.value

defineExpose({
  getTicketElement,
})
</script>
