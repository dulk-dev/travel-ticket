<template>
  <!-- 倾斜包装层：承载 3D 透视旋转，票根本体保持平面布局 -->
  <div
    ref="tiltWrapperRef"
    class="w-full relative"
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
    <!-- 左侧照片区：与票根边缘保持 padding 间距，照片本体圆角裁切 -->
    <div
      ref="photoContainerRef"
      class="relative"
      :style="{ width: photoWidth, height: '100%', padding: `${photoPadding}px` }"
    >
      <div
        class="relative w-full h-full overflow-hidden"
        :style="{ borderRadius: `${photoRadius}px` }"
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
  loadTextureImage,
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
// html2canvas 不支持 filter，导出图中自然不含此阴影（导出决定无投影，与之一致）。
const ticketShadowStyle = {
  filter:
    'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.30)) drop-shadow(0 28px 56px rgba(0, 0, 0, 0.32))',
}

// 使用 ResizeObserver 监听票根容器高度，动态计算缺口大小
let resizeObserver: ResizeObserver | null = null

// 背景板布纹原图：打孔齿孔孔体用它与页面背景色正片叠底，模拟打穿后露出布纹背景板
const bgTextureImg = ref<HTMLImageElement | null>(null)
loadTextureImage('linen')
  .then((img) => {
    bgTextureImg.value = img
  })
  .catch(() => {})

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

// ---- 票根轮廓 mask 烘焙 ----
// 轮廓包含多种异形镂空：左右边缘大半圆缺口、裁剪线位置上下小半圆缺口、
// 左右边缘成排细小切口。单层 radial-gradient 无法表达复合镂空，
// 与打孔齿孔同理烘焙为位图 mask（黑色 = 保留，透明 = 镂空），导出兼容性与旧实现一致。
const MASK_SCALE = 3 // 烘焙分辨率倍数，匹配导出 scale

// 缓存同时保留 canvas（供导出投影烘焙复用）与 data URL（供 mask-image 使用）
interface MaskEntry {
  canvas: HTMLCanvasElement
  url: string
}
const ticketMaskCache = new Map<string, MaskEntry>()

const getTicketMask = (w: number, h: number, photoRatio: number): MaskEntry | null => {
  const key = `${w}x${h}@${photoRatio}`
  const cached = ticketMaskCache.get(key)
  if (cached) return cached

  const s = MASK_SCALE
  const canvas = document.createElement('canvas')
  canvas.width = w * s
  canvas.height = h * s
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // 票根本体不透明
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.globalCompositeOperation = 'destination-out'
  const punch = (build: () => void) => {
    ctx.beginPath()
    build()
    ctx.fill()
  }

  // 左右两侧大半圆缺口：半径 = 票根高度 6%，必须小于照片区内嵌 padding（7.5%），
  // 保证缺口只落在纸张边缘上、不会裁到照片
  const bigR = h * 0.06 * s
  punch(() => ctx.arc(0, canvas.height / 2, bigR, 0, Math.PI * 2))
  punch(() => ctx.arc(canvas.width, canvas.height / 2, bigR, 0, Math.PI * 2))

  // 裁剪线位置上下两个小半圆缺口：半径为大缺口一半，x 对齐裁剪线条带中心
  const tearX = (photoRatio * w + 6) * s
  const smallR = bigR / 2
  punch(() => ctx.arc(tearX, 0, smallR, 0, Math.PI * 2))
  punch(() => ctx.arc(tearX, canvas.height, smallR, 0, Math.PI * 2))

  // 左右边缘成排细小切口：模仿多票相接的撕线 —— 以半圆咬口为主，
  // 深度/尺寸/位置保持高度一致，左右两缘镜像对称，呈现平衡秩序的实物感
  // （固定种子，同尺寸烘焙结果一致）
  let seed = 42
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const slotMargin = h * 0.06 * s
  const slotSpacing = h * 0.062 * s

  // 预生成整排切口参数（左右两缘镜像共用，保证对称）
  const rows: { y: number; size: number; depth: number; triangle: boolean }[] = []
  for (let cy = slotMargin + slotSpacing / 2; cy <= canvas.height - slotMargin; cy += slotSpacing) {
    const size = h * (0.042 + rand() * 0.008) * s // 尺寸仅 ±10% 微差
    const depth = h * (0.022 + rand() * 0.004) * s // 深度保持高度一致
    const y = cy + (rand() - 0.5) * slotSpacing * 0.1 // 位置微抖动
    // 绕开大缺口周围区域
    if (Math.abs(y - canvas.height / 2) < bigR + size / 2 + h * 0.03 * s) continue
    rows.push({ y, size, depth, triangle: rand() < 0.15 }) // 偶发小三角口
  }

  rows.forEach((row) => {
    const size = row.triangle ? row.size * 0.6 : row.size
    const depth = row.triangle ? row.depth * 0.75 : row.depth
    for (const edgeX of [0, canvas.width]) {
      const dir = edgeX === 0 ? 1 : -1
      punch(() => {
        if (row.triangle) {
          // 小三角口：底边贴票缘，尖角朝内
          ctx.moveTo(edgeX, row.y - size / 2)
          ctx.lineTo(edgeX + dir * depth, row.y)
          ctx.lineTo(edgeX, row.y + size / 2)
        } else {
          // 半圆咬口：圆心沿边内外偏移控制切入深度
          ctx.arc(edgeX + dir * (size / 2 - depth), row.y, size / 2, 0, Math.PI * 2)
        }
      })
    }
  })

  const entry: MaskEntry = { canvas, url: canvas.toDataURL('image/png') }
  if (ticketMaskCache.size > 30) ticketMaskCache.clear()
  ticketMaskCache.set(key, entry)
  return entry
}

// 照片区宽度占比（'65%' → 0.65），用于定位裁剪线缺口的 x 坐标
const photoRatio = computed(() => {
  const m = /^([\d.]+)%$/.exec(props.photoWidth.trim())
  const v = m?.[1] !== undefined ? parseFloat(m[1]) / 100 : NaN
  return Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : 0.65
})

// 票根容器样式 + 位图 mask：左右大缺口、裁剪线上下小缺口、边缘细小切口一次镂空成型
// 注意：mask 会裁掉落在票根边界外的 box-shadow，整票阴影因此由包装层 drop-shadow 承担
const ticketMaskStyle = computed(() => {
  const base = ticketBaseStyle.value
  // 未测量到高度时按 400px 逻辑高度烘焙（比例一致），避免首帧无 mask 闪跳
  const h = Math.round(ticketHeight.value) || 400
  const w = Math.round(h * 2.35)
  const url = getTicketMask(w, h, photoRatio.value)?.url ?? ''
  return {
    ...base,
    maskImage: `url(${url})`,
    WebkitMaskImage: `url(${url})`,
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
  }
})

// 照片区与票根边缘的间距、照片圆角：随票根高度等比缩放
// padding（7.5%）必须大于大缺口半径（6%），保证缺口不会裁到照片
const photoPadding = computed(() => Math.max(14, Math.round(ticketHeight.value * 0.075)))
const photoRadius = computed(() => Math.max(10, Math.round(ticketHeight.value * 0.04)))

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
// 孔体 = 页面背景色 + 背景板布纹（模拟打孔后露出票根背后的布纹页面），加孔壁阴影/高光。
// 与 usePaperTexture 同理烘焙为位图：html2canvas 对径向渐变支持有限，位图导出 100% 保真。
const HOLE_TILE_W = 12 // 与裁剪线条带同宽（CSS px）
const HOLE_TILE_H = 14 // 齿孔间距（CSS px）
const HOLE_RADIUS = 3 // 齿孔半径（CSS px）
const BAKE_SCALE = 3 // 烘焙分辨率倍数，匹配导出 scale

const perforationTileCache = new Map<string, string>()

const bakePerforationTile = (holeColor: string, texture: HTMLImageElement | null): string => {
  const key = `${holeColor}|${texture ? 'linen' : 'plain'}`
  const cached = perforationTileCache.get(key)
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

  // 孔体：页面背景色实心圆；有纹理时按原生尺度采样布纹正片叠底，
  // 与背景板烘焙（bakeTile）同一成色逻辑，孔体与页面背景观感一致
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = holeColor
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  if (texture) {
    ctx.globalCompositeOperation = 'multiply'
    const size = r * 2
    const sx = (texture.width - size) / 2
    const sy = (texture.height - size) / 2
    ctx.drawImage(texture, sx, sy, size, size, cx - r, cy - r, size, size)
  }
  ctx.restore()

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
  perforationTileCache.set(key, url)
  return url
}

const tearLinePatternStyle = computed(() => {
  // 纸张开启：打孔齿孔
  if (props.paperType !== 'none') {
    return {
      width: '100%',
      height: '100%',
      backgroundImage: `url(${bakePerforationTile(props.pageBgColor, bgTextureImg.value)})`,
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

// 当前票根轮廓 mask 的 canvas（含全部缺口镂空），供导出后处理补打缺口
// （html2canvas 不支持 mask-image，导出时需用它在 canvas 上手动镂空）
const getMaskCanvas = (): HTMLCanvasElement | null => {
  const h = Math.round(ticketHeight.value) || 400
  const w = Math.round(h * 2.35)
  return getTicketMask(w, h, photoRatio.value)?.canvas ?? null
}

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
  getMaskCanvas,
  getPhotoState,
  prepareForExport,
})
</script>
