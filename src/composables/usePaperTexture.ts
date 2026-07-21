import { ref, watch, type Ref } from 'vue'
import watercolorUrl from '@/assets/textures/watercolor.jpg'
import linenUrl from '@/assets/textures/linen.jpg'
import cottonUrl from '@/assets/textures/cotton.jpg'
import pearlUrl from '@/assets/textures/pearl.jpg'
import parchmentUrl from '@/assets/textures/parchment.jpg'

export type PaperType = 'none' | 'watercolor' | 'linen' | 'cotton' | 'pearl' | 'parchment'

export const PAPER_OPTIONS: { value: PaperType; label: string }[] = [
  { value: 'none', label: '无纹理' },
  { value: 'watercolor', label: '水彩纸' },
  { value: 'linen', label: '布纹纸' },
  { value: 'cotton', label: '棉卡纸' },
  { value: 'pearl', label: '珠光纸' },
  { value: 'parchment', label: '羊皮纸' },
]

// 灰度纹理原图（可平铺 512x512）
const RAW_TEXTURES: Record<Exclude<PaperType, 'none'>, string> = {
  watercolor: watercolorUrl,
  linen: linenUrl,
  cotton: cottonUrl,
  pearl: pearlUrl,
  parchment: parchmentUrl,
}

const TILE_SIZE = 512

// 纹理图加载缓存（同一个 URL 只加载一次）
const imageCache = new Map<string, Promise<HTMLImageElement>>()
// 烘焙结果缓存：key = 纸种|颜色，两个 TicketCard 实例共享，避免重复烘焙
const bakeCache = new Map<string, Promise<string>>()

const loadImage = (url: string): Promise<HTMLImageElement> => {
  let cached = imageCache.get(url)
  if (!cached) {
    cached = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`texture load failed: ${url}`))
      img.src = url
    })
    imageCache.set(url, cached)
  }
  return cached
}

/**
 * 将灰度纹理与指定颜色做正片叠底，烘焙成一张彩色纹理 tile（data URL）。
 * 烘焙产物是普通位图，html2canvas 导出时不会失真。
 * 票根纸质与页面背景板（布纹）共用此管线，结果带缓存。
 */
export const bakeTile = (paperType: Exclude<PaperType, 'none'>, color: string): Promise<string> => {
  const key = `${paperType}|${color}`
  let cached = bakeCache.get(key)
  if (!cached) {
    cached = (async () => {
      const img = await loadImage(RAW_TEXTURES[paperType])
      const canvas = document.createElement('canvas')
      canvas.width = TILE_SIZE
      canvas.height = TILE_SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) return ''
      ctx.fillStyle = color
      ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE)
      ctx.globalCompositeOperation = 'multiply'
      ctx.drawImage(img, 0, 0, TILE_SIZE, TILE_SIZE)
      return canvas.toDataURL('image/png')
    })()
    bakeCache.set(key, cached)
  }
  return cached
}

/** 加载纸种灰度原图（带缓存），供需要直接采样纹理的烘焙管线使用（如打孔齿孔孔体） */
export const loadTextureImage = (paperType: Exclude<PaperType, 'none'>): Promise<HTMLImageElement> =>
  loadImage(RAW_TEXTURES[paperType])

export function usePaperTexture(
  paperType: Ref<PaperType>,
  baseColor: Ref<string>,
  infoColor: Ref<string>,
) {
  // 底色区域（含照片区露出的底色）烘焙结果
  const baseTileUrl = ref('')
  // 信息区（提亮色）烘焙结果
  const infoTileUrl = ref('')
  // 照片覆盖层用的灰度原图（不随颜色变化）
  const overlayTileUrl = ref('')

  watch(
    [paperType, baseColor, infoColor],
    async ([type, base, info]) => {
      if (type === 'none') {
        baseTileUrl.value = ''
        infoTileUrl.value = ''
        overlayTileUrl.value = ''
        return
      }
      overlayTileUrl.value = RAW_TEXTURES[type]
      const [bakedBase, bakedInfo] = await Promise.all([bakeTile(type, base), bakeTile(type, info)])
      // 防止等待期间纸种又发生变化导致旧结果覆盖新结果
      if (paperType.value === type) {
        baseTileUrl.value = bakedBase
        infoTileUrl.value = bakedInfo
      }
    },
    { immediate: true },
  )

  return {
    baseTileUrl,
    infoTileUrl,
    overlayTileUrl,
  }
}

/** 各纸种照片覆盖层的不透明度（珠光最轻，水彩/羊皮最重） */
export const PHOTO_OVERLAY_OPACITY: Record<Exclude<PaperType, 'none'>, number> = {
  watercolor: 0.18,
  linen: 0.15,
  cotton: 0.12,
  pearl: 0.08,
  parchment: 0.18,
}
