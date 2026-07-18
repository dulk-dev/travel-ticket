<template>
  <!-- 倾斜包装层：承载 3D 透视旋转，票根本体保持平面布局 -->
  <div
    ref="tiltWrapperRef"
    class="w-full"
    :style="[tiltStyle, { maxWidth: '900px' }]"
    @mouseenter="onMouseEnter"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
    @pointerdown="onPointerDown"
  >
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
      <!-- 纸纹覆盖层：让照片也带上纸张质感 -->
      <div
        v-if="imageSrc && overlayTileUrl"
        class="absolute inset-0 pointer-events-none"
        :style="{
          backgroundImage: `url(${overlayTileUrl})`,
          backgroundRepeat: 'repeat',
          opacity: photoOverlayOpacity,
        }"
      ></div>
    </div>

    <!-- 裁剪线分隔效果 -->
    <div class="shrink-0 relative flex items-center justify-start" :style="tearLineStyle">
      <div :style="tearLinePatternStyle"></div>
    </div>

    <!-- 右侧信息区 -->
    <div class="flex-1 min-w-0" :style="infoAreaStyle">
      <InfoArea :info="info" :text-color="textColor">
        <template #barcode>
          <Barcode :value="info.code" :color="textColor" />
        </template>
      </InfoArea>
    </div>

    <!-- 珠光纸：整票对角渐变高光 + 彩虹色泽（珠光的五彩斑斓感） -->
    <div
      v-if="paperType === 'pearl'"
      class="absolute inset-0 pointer-events-none"
      :style="{
        background: [
          // 白色高光带
          'linear-gradient(115deg, transparent 25%, rgba(255,255,255,0.25) 40%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.20) 60%, transparent 78%)',
          // 彩虹色泽渐变
          'linear-gradient(125deg, rgba(255,150,180,0.13) 0%, rgba(255,225,140,0.13) 22%, rgba(150,255,190,0.12) 45%, rgba(140,200,255,0.13) 68%, rgba(225,160,255,0.12) 88%, rgba(255,150,180,0.10) 100%)',
        ].join(', '),
      }"
    ></div>

    <!-- 全息高光层：跟随鼠标 hover 位置的反光（导出图片时忽略） -->
    <div
      class="absolute inset-0 pointer-events-none"
      data-html2canvas-ignore="true"
      :style="glareStyle"
    ></div>
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
import {
  usePaperTexture,
  PHOTO_OVERLAY_OPACITY,
  type PaperType,
} from '@/composables/usePaperTexture'
import { useCardTilt } from '@/composables/useCardTilt'

interface Props {
  imageSrc: string
  info: TicketInfo
  primaryColor: string
  photoWidth?: string
  paperType?: PaperType
}

const props = withDefaults(defineProps<Props>(), {
  photoWidth: '65%',
  paperType: 'none',
})

const emit = defineEmits<{
  (e: 'upload', event: Event): void
  (e: 'drop', event: DragEvent): void
}>()

const ticketRef = ref<HTMLElement | null>(null)
const photoContainerRef = ref<HTMLElement | null>(null)
const ticketHeight = ref(0)

// hover 3D 倾斜 + 全息高光（作用在包装层，不影响票根布局与导出）
const tiltWrapperRef = ref<HTMLElement | null>(null)
const { tiltStyle, glareStyle, onMouseEnter, onMouseMove, onMouseLeave, onPointerDown } =
  useCardTilt(tiltWrapperRef)

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
  backgroundImage: baseTileUrl.value ? `url(${baseTileUrl.value})` : 'none',
  backgroundRepeat: 'repeat',
  aspectRatio: '2.35 / 1',
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

// 纸纹烘焙：底色区/信息区分别用对应颜色与灰度纹理正片叠底
const paperTypeRef = computed(() => props.paperType)
const primaryColorRef = computed(() => props.primaryColor)
const { baseTileUrl, infoTileUrl, overlayTileUrl } = usePaperTexture(
  paperTypeRef,
  primaryColorRef,
  infoBgColor,
)

const photoOverlayOpacity = computed(() => {
  if (props.paperType === 'none') return 0
  return PHOTO_OVERLAY_OPACITY[props.paperType]
})

// 信息区样式：提亮底色 + 烘焙纹理
const infoAreaStyle = computed(() => ({
  backgroundColor: infoBgColor.value,
  backgroundImage: infoTileUrl.value ? `url(${infoTileUrl.value})` : 'none',
  backgroundRepeat: 'repeat',
}))

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
const hasImage = computed(() => Boolean(props.imageSrc))

const tearLineStyle = computed(() => {
  // 裁剪线条带跟随所在区域的底色与纹理
  const tileUrl = hasImage.value ? infoTileUrl.value : baseTileUrl.value
  return {
    width: '12px',
    height: '100%',
    backgroundColor: hasImage.value ? infoBgColor.value : props.primaryColor,
    backgroundImage: tileUrl ? `url(${tileUrl})` : 'none',
    backgroundRepeat: 'repeat',
  }
})

const tearLinePatternStyle = computed(() => {
  const isDark = textColor.value !== '#2C2C2C'
  const lineColor = hasImage.value
    ? props.primaryColor
    : isDark
      ? 'rgba(255,255,255,0.35)'
      : 'rgba(0,0,0,0.2)'
  return {
    width: '4px',
    height: '100%',
    marginLeft: '1px',
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
