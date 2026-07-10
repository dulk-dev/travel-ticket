import { ref, type Ref } from 'vue'

export interface ExtractedColors {
  primary: string
  palette: string[]
  isDarkScene: boolean
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('')}`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
  }
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360
  s /= 100
  l /= 100
  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return { r: r * 255, g: g * 255, b: b * 255 }
}

function desaturateColor(hex: string, targetSaturation: number): string {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  hsl.s = Math.min(hsl.s, targetSaturation)
  const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l)
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b)
}

function adjustBrightness(hex: string, factor: number): string {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  hsl.l = Math.max(10, Math.min(95, hsl.l * factor))
  const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l)
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b)
}

export function useColorExtract() {
  const extractedColors = ref<ExtractedColors>({
    primary: '#F5F0EB',
    palette: [],
    isDarkScene: false,
  })

  const extractColors = (imageSrc: string): Promise<ExtractedColors> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(extractedColors.value)
          return
        }

        // 缩小采样以提高性能
        const sampleSize = 100
        canvas.width = sampleSize
        canvas.height = sampleSize
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize)

        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize)
        const data = imageData.data

        const colorMap = new Map<string, { count: number; brightness: number; saturation: number }>()
        let totalBrightness = 0
        let totalSaturation = 0
        let pixelCount = 0
        let brightPixelCount = 0

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]!
          const g = data[i + 1]!
          const b = data[i + 2]!
          const a = data[i + 3]!
          if (a < 128) continue

          const brightness = (r + g + b) / 3
          const hsl = rgbToHsl(r, g, b)
          totalBrightness += brightness
          totalSaturation += hsl.s
          pixelCount++

          if (brightness > 150) brightPixelCount++

          // 量化颜色用于聚类
          const quantizedR = Math.round((r as number) / 16) * 16
          const quantizedG = Math.round((g as number) / 16) * 16
          const quantizedB = Math.round((b as number) / 16) * 16
          const key = `${quantizedR},${quantizedG},${quantizedB}`

          const existing = colorMap.get(key)
          if (existing) {
            existing.count++
          } else {
            colorMap.set(key, { count: 1, brightness, saturation: hsl.s })
          }
        }

        const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 128
        const avgSaturation = pixelCount > 0 ? totalSaturation / pixelCount : 0
        const isDarkScene = avgBrightness < 80 && brightPixelCount > pixelCount * 0.05

        // 排序获取主要颜色
        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 20)

        // 夜景处理：优先选择高亮区域的颜色
        let candidateColors = sortedColors
        if (isDarkScene) {
          candidateColors = sortedColors.filter(([, info]) => info.brightness > 100 && info.saturation > 20)
          if (candidateColors.length < 6) {
            candidateColors = sortedColors
          }
        }

        // 去重并选择差异明显的颜色
        const uniqueColors: string[] = []
        for (const [key] of candidateColors) {
          const parts = key.split(',').map(Number)
          const r = parts[0] || 0
          const g = parts[1] || 0
          const b = parts[2] || 0
          const hex = rgbToHex(r, g, b)

          const isSimilar = uniqueColors.some(existing => {
            const existingRgb = hexToRgb(existing)
            const distance = Math.sqrt(
              Math.pow((r as number) - existingRgb.r, 2) +
              Math.pow((g as number) - existingRgb.g, 2) +
              Math.pow((b as number) - existingRgb.b, 2)
            )
            return distance < 40
          })

          if (!isSimilar) {
            uniqueColors.push(hex)
          }

          if (uniqueColors.length >= 6) break
        }

        // 如果颜色不够，补充一些变体
        while (uniqueColors.length < 6) {
          const base = uniqueColors[0] || '#7BA3C2'
          const rgb = hexToRgb(base)
          const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
          hsl.h = (hsl.h + 60 * uniqueColors.length) % 360
          const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l)
          uniqueColors.push(rgbToHex(newRgb.r, newRgb.g, newRgb.b))
        }

        // 低饱和处理
        const desaturatedColors = uniqueColors.map(c => desaturateColor(c, 40))
        const primary = desaturatedColors[0] || '#F5F0EB'

        extractedColors.value = {
          primary,
          palette: desaturatedColors,
          isDarkScene,
        }

        resolve(extractedColors.value)
      }

      img.onerror = () => {
        resolve(extractedColors.value)
      }

      img.src = imageSrc
    })
  }

  const setPrimaryColor = (color: string) => {
    extractedColors.value = {
      ...extractedColors.value,
      primary: color,
    }
  }

  return {
    extractedColors,
    extractColors,
    setPrimaryColor,
  }
}
