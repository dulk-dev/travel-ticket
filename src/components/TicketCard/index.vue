<template>
  <!-- 倾斜包装层：承载 3D 透视旋转，票根本体保持平面布局 -->
  <div
    ref="tiltWrapperRef"
    class="w-full"
    :style="[tiltStyle, { maxWidth: '900px' }, ticketShadowStyle]"
    @mouseenter="onMouseEnter"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
    @pointerdown="onPointerDown"
  >
    <div
      ref="ticketRef"
      class="relative flex"
      :style="ticketMaskStyle"
    >
    <!-- 左侧照片区 -->
    <div
      ref="photoContainerRef"
      class="relative overflow-hidden"
      :style="{ width: photoWidth, height: '100%' }"
    >
      <PhotoArea
        ref="photoAreaCompRef"
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
      <InfoArea ref="infoAreaCompRef" :info="info" :text-color="textColor">
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
import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue'
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
import type { PhotoState } from '@/composables/usePhotoTransform'

interface Props {
  imageSrc: string
  info: TicketInfo
  primaryColor: string
  photoWidth?: string
  paperType?: PaperType
  pageBgColor: string
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
const photoAreaCompRef = ref<InstanceType<typeof PhotoArea> | null>(null)
const infoAreaCompRef = ref<InstanceType<typeof InfoArea> | null>(null)
const ticketHeight = ref(0)

// hover 3D 倾斜 + 全息高光（作用在包装层，不影响票根布局与导出）
const tiltWrapperRef = ref<HTMLElement | null>(null)
const { tiltStyle, glareStyle, onMouseEnter, onMouseMove, onMouseLeave, onPointerDown } =
  useCardTilt(tiltWrapperRef)

// 整票阴影：必须放在倾斜包装层而非票根本体 —— 票根带 mask-image（右侧缺口），
// box-shadow 会被 mask 裁掉；drop-shadow 滤镜则跟随 mask 后的真实轮廓（圆角 + 缺口镂空）投影。
// 双层阴影模拟实物纸票：近层接触阴影（小而实）+ 远层环境阴影（大而柔）。
// 包装层不参与导出（导出目标是 ticketRef），故导出的票根图片保持纯净无阴影。
const ticketShadowStyle = {
  filter:
    'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.30)) drop-shadow(0 28px 56px rgba(0, 0, 0, 0.32))',
}

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
// 使用 radial-gradient 创建透明圆形区域，形成真正的镂空效果
// 注意：mask 会裁掉落在票根边界外的 box-shadow，整票阴影因此由包装层 drop-shadow 承担
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

// 裁剪线分隔样式：无纹理时使用扁平虚线；纸张开启时使用打孔齿孔（仿实物撕线）
const hasImage = computed(() => Boolean(props.imageSrc))

// ---- 打孔齿孔 tile 烘焙 ----
// 孔体 = 页面背景色（模拟打孔后露出票根背后的页面），加孔壁阴影/高光。
// 与 usePaperTexture 同理烘焙为位图：html2canvas 对径向渐变支持有限，位图导出 100% 保真。
const HOLE_TILE_W = 12 // 与裁剪线条带同宽（CSS px）
const HOLE_TILE_H = 14 // 齿孔间距（CSS px）
const HOLE_RADIUS = 3 // 齿孔半径（CSS px）
const BAKE_SCALE = 3 // 烘焙分辨率倍数，匹配导出 scale

const perforationTileCache = new Map<string, string>()

const bakePerforationTile = (holeColor: string): string => {
  const cached = perforationTileCache.get(holeColor)
  if (cached) return cached

  const w = HOLE_TILE_W * BAKE_SCALE
  const h = HOLE_TILE_H * BAKE_SCALE
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // 条带两侧轻压痕（先画，孔体覆盖其上）
  const crease = ctx.createLinearGradient(0, 0, w, 0)
  crease.addColorStop(0, 'rgba(0,0,0,0.10)')
  crease.addColorStop(0.28, 'rgba(0,0,0,0)')
  crease.addColorStop(0.72, 'rgba(0,0,0,0)')
  crease.addColorStop(1, 'rgba(0,0,0,0.10)')
  ctx.fillStyle = crease
  ctx.fillRect(0, 0, w, h)

  const cx = w / 2
  const cy = h / 2
  const r = HOLE_RADIUS * BAKE_SCALE

  // 孔体：页面背景色实心圆
  ctx.fillStyle = holeColor
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // 孔内下沿阴影：光来自上方，孔洞深处偏暗
  const inner = ctx.createRadialGradient(cx, cy + r * 0.2, r * 0.3, cx, cy + r * 0.2, r)
  inner.addColorStop(0, 'rgba(0,0,0,0)')
  inner.addColorStop(1, 'rgba(0,0,0,0.30)')
  ctx.fillStyle = inner
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // 孔外上沿高光：纸张被打穿后上沿受光的亮弧
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.lineWidth = BAKE_SCALE * 0.9
  ctx.beginPath()
  ctx.arc(cx, cy, r + ctx.lineWidth, Math.PI * 1.1, Math.PI * 1.9)
  ctx.stroke()

  const url = canvas.toDataURL('image/png')
  perforationTileCache.set(holeColor, url)
  return url
}

const tearLinePatternStyle = computed(() => {
  // 纸张开启：打孔齿孔
  if (props.paperType !== 'none') {
    return {
      width: '100%',
      height: '100%',
      backgroundImage: `url(${bakePerforationTile(props.pageBgColor)})`,
      backgroundRepeat: 'repeat-y',
      backgroundPosition: 'center top',
      backgroundSize: `${HOLE_TILE_W}px ${HOLE_TILE_H}px`,
    }
  }
  // 无纹理：扁平虚线
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



const handleUpload = (e: Event) => {
  emit('upload', e)
}

const handleDrop = (e: DragEvent) => {
  emit('drop', e)
}

const getTicketElement = () => ticketRef.value

// 读取当前照片取景状态（缩放/平移 + 铺满基准尺寸），供导出实例做比例映射
const getPhotoState = () => photoAreaCompRef.value?.getPhotoState()

// 导出前置准备：字号/地点缩放/图片铺满尺寸都是 ResizeObserver 异步烘焙的，
// 可能滞后于当前布局；html2canvas 直接克隆 DOM 快照，
// 必须先同步重算（并可按需映射取景状态）并等待 Vue 刷进内联样式。
const prepareForExport = async (photoState?: PhotoState) => {
  infoAreaCompRef.value?.recompute()
  photoAreaCompRef.value?.recompute()
  if (photoState) photoAreaCompRef.value?.applyPhotoState(photoState)
  await nextTick()
}

defineExpose({
  getTicketElement,
  getPhotoState,
  prepareForExport,
})
</script>
