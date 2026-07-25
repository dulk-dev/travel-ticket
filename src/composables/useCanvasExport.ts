import { ref } from 'vue'
import JsBarcode from 'jsbarcode'
import type { TicketInfo } from './useMockData'
import type { PhotoState } from './usePhotoTransform'
import { bakeTile, loadTextureImage, PHOTO_OVERLAY_OPACITY, type PaperType } from './usePaperTexture'
import { hexToRgb, rgbToHsl, hslToRgb, rgbToHex } from './useColorExtract'

export interface CanvasExportParams {
  imageSrc: string
  info: TicketInfo
  primaryColor: string
  paperType: PaperType
  photoState?: PhotoState
  isDesktop: boolean
}

// 导出画框尺寸（与 HomeView 保持一致）
const FRAME_WIDTH = 900 + 96 * 2
const FRAME_HEIGHT = Math.round(FRAME_WIDTH * 0.75)
const TICKET_WIDTH = 900
const TICKET_HEIGHT = Math.round(TICKET_WIDTH / 2.35)
const SCALE = 3

// 票根在画框中的位置（居中）
const TICKET_X = (FRAME_WIDTH - TICKET_WIDTH) / 2
const TICKET_Y = (FRAME_HEIGHT - TICKET_HEIGHT) / 2

// 照片区参数（复用 TicketCard 的比例）
const PHOTO_WIDTH_RATIO = 0.65 // 桌面端 65%（照片区占票根宽度的比例）
const PHOTO_WIDTH_RATIO_MOBILE = 0.58 // 移动端 58%

// 切割线参数
const TEAR_LINE_WIDTH = 12
const HOLE_TILE_H = 14
const HOLE_RADIUS = 3

// 文字参数（复用 InfoArea 的比例）
const BASE_FONT_RATIO = 0.06 // 基准字号 = 票根高度 6%
const LOCATION_FONT_RATIO = 2.2 // 地点字号 = 基准 2.2 倍
const DATE_FONT_RATIO = 1.15
const CODE_FONT_RATIO = 0.95

function lightenColor(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  const lighten = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount))
  return rgbToHex(lighten(r), lighten(g), lighten(b))
}

function getTextColor(bgHex: string): string {
  const { r, g, b } = hexToRgb(bgHex)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128 ? '#2C2C2C' : '#F5F0EB'
}

function getPageBgColor(primaryHex: string): string {
  const { r, g, b } = hexToRgb(primaryHex)
  const hsl = rgbToHsl(r, g, b)
  const bgL = Math.min(hsl.l * 0.5, 46)
  const bgS = Math.min(Math.max(hsl.s * 0.55, 22), 45)
  const rgb = hslToRgb(hsl.h, bgS, bgL)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

function formatDate(date: string): string {
  if (!date) return '2026 - 07'
  const parts = date.split('-')
  if (parts.length >= 2) return `${parts[0]} - ${parts[1]}`
  return date
}

function formatCode(code: string, date: string): string {
  if (date) {
    const parts = date.split('-')
    if (parts.length >= 3) return `NO.${parts[0]}${parts[1]}${parts[2]}`
    if (parts.length >= 2) return `NO.${parts[0]}${parts[1]}01`
  }
  if (code && code.length === 6) return `NO.20${code}`
  return `NO.${code || '20260701'}`
}

function splitLocationLines(location: string): [string, string] {
  if (!location) return ['UNKN', 'OWN']
  if (/[一-鿿]/.test(location)) {
    const clean = location.replace(/[市省区]/g, '')
    // 简单按字数分两行
    const mid = Math.ceil(clean.length / 2)
    return [clean.slice(0, mid).toUpperCase(), clean.slice(mid).toUpperCase()]
  }
  const words = location.trim().toUpperCase().split(/\s+/).filter((w) => w.length > 0)
  if (words.length === 0) return ['UNKN', 'OWN']
  if (words.length === 1) return [words[0], '']
  const totalLen = words.reduce((s, w) => s + w.length, 0)
  let bestSplit = 1
  let minDiff = Infinity
  for (let i = 1; i < words.length; i++) {
    const firstLen = words.slice(0, i).reduce((s, w) => s + w.length, 0)
    const diff = Math.abs(firstLen - (totalLen - firstLen))
    if (diff < minDiff) {
      minDiff = diff
      bestSplit = i
    }
  }
  return [
    words.slice(0, bestSplit).join('').toUpperCase(),
    words.slice(bestSplit).join('').toUpperCase(),
  ]
}

function buildTicketPath(w: number, h: number): Path2D {
  const path = new Path2D()
  path.roundRect(0, 0, w, h, 12)
  return path
}

function punchTicketHoles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  photoRatio: number,
) {
  ctx.globalCompositeOperation = 'destination-out'

  const bigR = h * 0.06
  const tearX = photoRatio * w + 6
  const smallR = bigR / 2

  // 左右大半圆缺口
  ctx.beginPath()
  ctx.arc(0, h / 2, bigR, 0, Math.PI * 2)
  ctx.arc(w, h / 2, bigR, 0, Math.PI * 2)
  ctx.fill()

  // 裁剪线位置上下小半圆缺口
  ctx.beginPath()
  ctx.arc(tearX, 0, smallR, 0, Math.PI * 2)
  ctx.arc(tearX, h, smallR, 0, Math.PI * 2)
  ctx.fill()

  // 左右边缘成排细小切口
  const slotMargin = h * 0.06
  const slotSpacing = h * 0.062
  const slotSize = h * 0.055 // 增大切口尺寸
  const slotDepth = h * 0.03 // 增大切口深度

  for (let cy = slotMargin + slotSpacing / 2; cy <= h - slotMargin; cy += slotSpacing) {
    if (Math.abs(cy - h / 2) < bigR + slotSize / 2 + h * 0.03) continue

    // 左缘半圆咬口
    ctx.beginPath()
    ctx.arc(slotSize / 2 - slotDepth, cy, slotSize / 2, 0, Math.PI * 2)
    ctx.fill()
    // 右缘半圆咬口
    ctx.beginPath()
    ctx.arc(w - slotSize / 2 + slotDepth, cy, slotSize / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalCompositeOperation = 'source-over'
}

async function drawBarcode(
  ctx: CanvasRenderingContext2D,
  code: string,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): Promise<void> {
  return new Promise((resolve) => {
    try {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      JsBarcode(svg, code || '000000', {
        format: 'CODE128',
        width: Math.max(0.8, h / 24),
        height: Math.round(h * 0.75),
        displayValue: false,
        lineColor: color,
        background: 'transparent',
        margin: 0,
      })
      const svgData = new XMLSerializer().serializeToString(svg)
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, x, y, w, h)
        resolve()
      }
      img.onerror = () => resolve() // 失败时静默跳过
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
    } catch {
      resolve()
    }
  })
}

function drawPerforation(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  holeColor: string,
  textureImg: HTMLImageElement | null,
) {
  const cx = x + TEAR_LINE_WIDTH / 2
  for (let cy = y; cy < y + height; cy += HOLE_TILE_H) {
    const centerY = cy + HOLE_TILE_H / 2

    // 孔体
    ctx.beginPath()
    ctx.arc(cx, centerY, HOLE_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = holeColor
    ctx.fill()

    // 孔内纹理（如果有）
    if (textureImg) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, centerY, HOLE_RADIUS, 0, Math.PI * 2)
      ctx.clip()
      ctx.globalCompositeOperation = 'multiply'
      const size = HOLE_RADIUS * 2
      const sx = (textureImg.width - size) / 2
      const sy = (textureImg.height - size) / 2
      ctx.drawImage(textureImg, sx, sy, size, size, cx - HOLE_RADIUS, centerY - HOLE_RADIUS, size, size)
      ctx.restore()
    }

    // 孔内下沿阴影
    const inner = ctx.createRadialGradient(cx, centerY + HOLE_RADIUS * 0.2, HOLE_RADIUS * 0.3, cx, centerY + HOLE_RADIUS * 0.2, HOLE_RADIUS)
    inner.addColorStop(0, 'rgba(0,0,0,0)')
    inner.addColorStop(1, 'rgba(0,0,0,0.30)')
    ctx.fillStyle = inner
    ctx.beginPath()
    ctx.arc(cx, centerY, HOLE_RADIUS, 0, Math.PI * 2)
    ctx.fill()

    // 孔外上沿高光
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'
    ctx.lineWidth = 0.9
    ctx.beginPath()
    ctx.arc(cx, centerY, HOLE_RADIUS + ctx.lineWidth, Math.PI * 1.1, Math.PI * 1.9)
    ctx.stroke()
  }
}

export function useCanvasExport() {
  const isExporting = ref(false)
  const exportError = ref<string | null>(null)

  const exportTicket = async (params: CanvasExportParams): Promise<string | null> => {
    isExporting.value = true
    exportError.value = null

    try {
      const canvas = document.createElement('canvas')
      canvas.width = FRAME_WIDTH * SCALE
      canvas.height = FRAME_HEIGHT * SCALE
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas context unavailable')

      const photoRatio = params.isDesktop ? PHOTO_WIDTH_RATIO : PHOTO_WIDTH_RATIO_MOBILE
      const pageBgColor = getPageBgColor(params.primaryColor)
      const infoBgColor = lightenColor(params.primaryColor, 0.15)
      const textColor = getTextColor(params.primaryColor)

      // 1. 绘制页面背景（布纹 + 颜色）
      const bgTileUrl = await bakeTile('linen', pageBgColor)
      if (bgTileUrl) {
        const bgImg = new Image()
        await new Promise<void>((resolve, reject) => {
          bgImg.onload = () => resolve()
          bgImg.onerror = () => reject(new Error('bg texture load failed'))
          bgImg.src = bgTileUrl
        })
        // 先铺底色，再乘纹理（避免 pattern scale 变换问题）
        ctx.fillStyle = pageBgColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.globalCompositeOperation = 'multiply'
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height)
        ctx.globalCompositeOperation = 'source-over'
      } else {
        ctx.fillStyle = pageBgColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // 2. 票根主体：先画完整圆角矩形，再用 destination-out 打缺口
      ctx.save()
      ctx.scale(SCALE, SCALE)

      // 票根底色
      ctx.fillStyle = params.primaryColor
      ctx.beginPath()
      ctx.roundRect(TICKET_X, TICKET_Y, TICKET_WIDTH, TICKET_HEIGHT, 12)
      ctx.fill()

      // 票根纹理
      if (params.paperType !== 'none') {
        const baseTileUrl = await bakeTile(params.paperType, params.primaryColor)
        if (baseTileUrl) {
          const tileImg = new Image()
          await new Promise<void>((resolve) => {
            tileImg.onload = () => resolve()
            tileImg.onerror = () => resolve()
            tileImg.src = baseTileUrl
          })
          ctx.save()
          ctx.beginPath()
          ctx.roundRect(TICKET_X, TICKET_Y, TICKET_WIDTH, TICKET_HEIGHT, 12)
          ctx.clip()
          ctx.globalCompositeOperation = 'multiply'
          const pattern = ctx.createPattern(tileImg, 'repeat')
          if (pattern) {
            ctx.fillStyle = pattern
            ctx.fillRect(TICKET_X, TICKET_Y, TICKET_WIDTH, TICKET_HEIGHT)
          }
          ctx.restore()
        }
      }

      // 照片区
      const photoX = TICKET_X + TICKET_HEIGHT * 0.075
      const photoY = TICKET_Y + TICKET_HEIGHT * 0.075
      const photoW = TICKET_WIDTH * photoRatio - TICKET_HEIGHT * 0.075 * 2
      const photoH = TICKET_HEIGHT - TICKET_HEIGHT * 0.075 * 2
      const photoRadius = Math.max(10, TICKET_HEIGHT * 0.04)

      if (params.imageSrc) {
        const photoImg = new Image()
        photoImg.crossOrigin = 'anonymous'
        await new Promise<void>((resolve, reject) => {
          photoImg.onload = () => resolve()
          photoImg.onerror = () => reject(new Error('photo load failed'))
          photoImg.src = params.imageSrc
        })

        ctx.save()
        ctx.beginPath()
        ctx.roundRect(photoX, photoY, photoW, photoH, photoRadius)
        ctx.clip()

        // 计算照片铺满后的基准尺寸
        const baseScale = Math.max(photoW / photoImg.naturalWidth, photoH / photoImg.naturalHeight)
        const baseW = photoImg.naturalWidth * baseScale
        const baseH = photoImg.naturalHeight * baseScale

        // 应用用户变换
        const state = params.photoState || { scale: 1, translateX: 0, translateY: 0, baseWidth: baseW, baseHeight: baseH }
        const scale = state.scale
        const tx = (state.translateX * baseW) / (state.baseWidth || baseW)
        const ty = (state.translateY * baseH) / (state.baseHeight || baseH)

        ctx.translate(photoX + photoW / 2 + tx, photoY + photoH / 2 + ty)
        ctx.scale(scale, scale)
        ctx.drawImage(photoImg, -baseW / 2, -baseH / 2, baseW, baseH)
        ctx.restore()

        // 照片纸纹覆盖层
        if (params.paperType !== 'none') {
          const overlayOpacity = PHOTO_OVERLAY_OPACITY[params.paperType]
          const rawTexture = await loadTextureImage(params.paperType)
          if (rawTexture && overlayOpacity > 0) {
            ctx.save()
            ctx.beginPath()
            ctx.roundRect(photoX, photoY, photoW, photoH, photoRadius)
            ctx.clip()
            ctx.globalAlpha = overlayOpacity
            ctx.globalCompositeOperation = 'multiply'
            const pattern = ctx.createPattern(rawTexture, 'repeat')
            if (pattern) {
              ctx.fillStyle = pattern
              ctx.fillRect(photoX, photoY, photoW, photoH)
            }
            ctx.restore()
          }
        }
      } else {
        // 无照片时画占位区
        ctx.save()
        ctx.beginPath()
        ctx.roundRect(photoX, photoY, photoW, photoH, photoRadius)
        ctx.clip()
        // 半透明浅色底
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
        ctx.fillRect(photoX, photoY, photoW, photoH)
        ctx.restore()
        // 占位文字
        ctx.fillStyle = '#3f3f46'
        ctx.font = `500 ${TICKET_HEIGHT * 0.045}px system-ui, -apple-system, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('上传照片', photoX + photoW / 2, photoY + photoH / 2)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
      }

      // 信息区背景
      const infoX = TICKET_X + TICKET_WIDTH * photoRatio + TEAR_LINE_WIDTH
      const infoW = TICKET_WIDTH - TICKET_WIDTH * photoRatio - TEAR_LINE_WIDTH
      ctx.fillStyle = infoBgColor
      ctx.fillRect(infoX, TICKET_Y, infoW, TICKET_HEIGHT)

      if (params.paperType !== 'none') {
        const infoTileUrl = await bakeTile(params.paperType, infoBgColor)
        if (infoTileUrl) {
          const infoTileImg = new Image()
          await new Promise<void>((resolve) => {
            infoTileImg.onload = () => resolve()
            infoTileImg.onerror = () => resolve()
            infoTileImg.src = infoTileUrl
          })
          ctx.save()
          ctx.beginPath()
          ctx.rect(infoX, TICKET_Y, infoW, TICKET_HEIGHT)
          ctx.clip()
          ctx.globalCompositeOperation = 'multiply'
          const pattern = ctx.createPattern(infoTileImg, 'repeat')
          if (pattern) {
            ctx.fillStyle = pattern
            ctx.fillRect(infoX, TICKET_Y, infoW, TICKET_HEIGHT)
          }
          ctx.restore()
        }
      }

      // 切割线（打孔齿孔）—— 与 punchTicketHoles 的 tearX 保持一致（+6 偏移）
      const tearX = TICKET_X + TICKET_WIDTH * photoRatio + 6
      const bgTextureImg = await loadTextureImage('linen').catch(() => null)
      drawPerforation(ctx, tearX - TEAR_LINE_WIDTH / 2, TICKET_Y, TICKET_HEIGHT, pageBgColor, bgTextureImg)

      // 文字信息
      const baseFontSize = Math.max(6, TICKET_HEIGHT * BASE_FONT_RATIO)
      const locationFontSize = baseFontSize * LOCATION_FONT_RATIO
      const infoPaddingX = infoW * 0.04
      const infoPaddingY = TICKET_HEIGHT * 0.03
      const textX = infoX + infoPaddingX
      let textY = TICKET_Y + infoPaddingY

      ctx.fillStyle = textColor
      ctx.textBaseline = 'top'
      ctx.textAlign = 'left'

      // 地点（两行）
      const locationLines = splitLocationLines(params.info.location)
      ctx.font = `900 ${locationFontSize}px system-ui, -apple-system, sans-serif`
      ctx.fillText(locationLines[0], textX, textY)
      textY += locationFontSize * 1.05
      ctx.fillText(locationLines[1], textX, textY)
      textY += locationFontSize * 1.05 + baseFontSize * 0.3

      // 日期
      ctx.font = `500 ${baseFontSize * DATE_FONT_RATIO}px system-ui, -apple-system, sans-serif`
      ctx.globalAlpha = 0.85
      ctx.fillText(formatDate(params.info.date), textX, textY)
      textY += baseFontSize * DATE_FONT_RATIO * 1.5
      ctx.globalAlpha = 1

      // 编号
      ctx.font = `${baseFontSize * CODE_FONT_RATIO}px monospace`
      ctx.globalAlpha = 0.9
      ctx.fillText(formatCode(params.info.code, params.info.date), textX, textY)
      textY += baseFontSize * CODE_FONT_RATIO * 1.5
      ctx.globalAlpha = 1

      // 随机码
      ctx.font = `${baseFontSize * CODE_FONT_RATIO}px monospace`
      ctx.globalAlpha = 0.7
      ctx.fillText(params.info.randomCode || 'X8K2M', textX, textY)
      textY += baseFontSize * CODE_FONT_RATIO * 1.5 + baseFontSize * 0.5
      ctx.globalAlpha = 1

      // 条形码
      const barcodeH = baseFontSize * 2.4
      const barcodeW = infoW - infoPaddingX * 2
      await drawBarcode(ctx, params.info.code, textX, textY, barcodeW, barcodeH, textColor)

      // 最后打缺口（destination-out）—— 在所有内容绘制完成后执行
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = TICKET_WIDTH * SCALE
      tempCanvas.height = TICKET_HEIGHT * SCALE
      const tempCtx = tempCanvas.getContext('2d')
      if (tempCtx) {
        // 从主 canvas 复制票根区域（考虑 SCALE）
        tempCtx.drawImage(
          canvas,
          TICKET_X * SCALE, TICKET_Y * SCALE, TICKET_WIDTH * SCALE, TICKET_HEIGHT * SCALE,
          0, 0, TICKET_WIDTH * SCALE, TICKET_HEIGHT * SCALE,
        )
        // 在临时 canvas 上打缺口
        tempCtx.save()
        tempCtx.scale(SCALE, SCALE)
        punchTicketHoles(tempCtx, TICKET_WIDTH, TICKET_HEIGHT, photoRatio)
        tempCtx.restore()
        // 将处理后的票根绘制回主 canvas
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.drawImage(tempCanvas, TICKET_X * SCALE, TICKET_Y * SCALE)
        ctx.restore()
      }

      ctx.restore()

      // 9. 输出
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      isExporting.value = false
      return dataUrl
    } catch (err) {
      console.error('[useCanvasExport] failed:', err)
      exportError.value = '导出失败，请重试'
      isExporting.value = false
      return null
    }
  }

  return {
    isExporting,
    exportError,
    exportTicket,
  }
}
