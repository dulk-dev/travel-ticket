<template>
  <div
    ref="ticketRef"
    class="relative flex shadow-2xl"
    :style="ticketMaskStyle"
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

    <!-- 裁剪线分隔效果 -->
    <div class="shrink-0 relative flex items-center justify-center" :style="tearLineStyle">
      <div :style="tearLinePatternStyle"></div>
    </div>

    <!-- 右侧信息区 -->
    <div class="flex-1 min-w-0" :style="{ backgroundColor: infoBgColor }">
      <InfoArea :info="info" :text-color="textColor">
        <template #barcode>
          <Barcode :value="info.code" :color="textColor" />
        </template>
      </InfoArea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
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
  photoWidth: '65%',
})

const emit = defineEmits<{
  (e: 'upload', event: Event): void
  (e: 'drop', event: DragEvent): void
}>()

const ticketRef = ref<HTMLElement | null>(null)
const photoContainerRef = ref<HTMLElement | null>(null)
const ticketHeight = ref(0)

// 使用 ResizeObserver 监听票根容器高度，动态计算缺口大小
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (ticketRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        ticketHeight.value = entry.contentRect.height
      }
    })
    resizeObserver.observe(ticketRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

const ticketBaseStyle = computed(() => ({
  backgroundColor: props.primaryColor,
  aspectRatio: '2.35 / 1',
  maxWidth: '900px',
  width: '100%',
  borderRadius: '12px',
  overflow: 'hidden',
}))

// 票根容器样式 + mask-image 在右侧中间切出半圆形缺口
// 缺口直径 = 票根高度的 1/5，半径 = 高度 / 10
// 使用 radial-gradient 创建透明圆形区域，形成真正的镂空效果（阴影也会被切掉）
const ticketMaskStyle = computed(() => {
  // 默认半径 18px，有实际高度后按高度的 1/10 计算
  const notchRadius = Math.max(18, Math.round(ticketHeight.value / 10))
  const base = ticketBaseStyle.value
  return {
    ...base,
    maskImage: `radial-gradient(circle at calc(100% + 2px) 50%, transparent ${notchRadius}px, black ${notchRadius + 1}px)`,
    WebkitMaskImage: `radial-gradient(circle at calc(100% + 2px) 50%, transparent ${notchRadius}px, black ${notchRadius + 1}px)`,
  }
})

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

// 裁剪线分隔样式：使用 repeating-linear-gradient 实现虚线效果
const tearLineStyle = computed(() => ({
  width: '12px',
  height: '100%',
  backgroundColor: props.primaryColor,
}))

const tearLinePatternStyle = computed(() => {
  const isDark = textColor.value !== '#2C2C2C'
  const lineColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)'
  return {
    width: '3px',
    height: '100%',
    background: `repeating-linear-gradient(
      to bottom,
      ${lineColor} 0px,
      ${lineColor} 6px,
      transparent 6px,
      transparent 12px
    )`,
  }
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
