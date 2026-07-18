import { ref, type Ref } from 'vue'

export interface ExtractedColors {
  primary: string
  palette: string[]
  isDarkScene: boolean
}

export type DesaturationStrategy = 'none' | 'adaptive' | 'smart'

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('')}`
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
  }
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
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

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
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

// ========== 方案A：完全不移除降饱和，保留原始饱和度 ==========
function applyStrategyNone(colors: string[]): string[] {
  return colors
}

// ========== 方案B：根据图片整体饱和度动态调整降饱和强度 ==========
function applyStrategyAdaptive(colors: string[], avgSaturation: number): string[] {
  let targetSaturation: number
  if (avgSaturation > 50) {
    targetSaturation = 70
  } else if (avgSaturation > 30) {
    targetSaturation = 50
  } else {
    targetSaturation = 40
  }
  return colors.map(c => desaturateColor(c, targetSaturation))
}

// ========== 方案C：智能分类，保留高饱和主色，只降低低饱和杂色 ==========
function applyStrategySmart(colors: string[]): string[] {
  return colors.map((c, index) => {
    const rgb = hexToRgb(c)
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    if (index < 2 && hsl.s > 50) {
      return desaturateColor(c, 65)
    }
    return desaturateColor(c, 40)
  })
}

// ========== 改进版颜色提取算法 ==========

interface ColorInfo {
  count: number
  brightness: number
  saturation: number
  hue: number
  lightness: number
  r: number
  g: number
  b: number
}

/**
 * 计算颜色的视觉显著性分数
 * 综合考虑：像素数量、饱和度、亮度适中度
 * 与已选颜色的色相差异越大，分数越高（促进色板多样性）
 */
function calculateVisualScore(info: ColorInfo, maxCount: number, selectedHues: number[] = []): number {
  // 频率权重 (0-1)
  const frequencyScore = info.count / maxCount

  // 饱和度权重：高饱和颜色获得显著加分
  const saturationScore = Math.min(info.saturation / 100, 1)

  // 亮度适中度：放宽限制，允许较亮的颜色
  const lightnessIdeal = 60
  const lightnessDeviation = Math.abs(info.lightness - lightnessIdeal) / 60
  const lightnessScore = Math.max(0, 1 - lightnessDeviation)

  // 色相差异奖励：与已选颜色色相差异越大，奖励越高
  let hueDiversityScore = 0
  if (selectedHues.length > 0) {
    const minHueDist = Math.min(...selectedHues.map(h => hueDistance(info.hue, h)))
    // 色相差异越大，奖励越高（0-0.3）
    hueDiversityScore = (minHueDist / 180) * 0.3
  }

  // 综合分数：频率 * 0.35 + 饱和度 * 0.35 + 亮度适中 * 0.15 + 色相差异 * 0.15
  return frequencyScore * 0.35 + saturationScore * 0.35 + lightnessScore * 0.15 + hueDiversityScore
}

/**
 * 色相距离计算（考虑色相环的循环特性）
 */
function hueDistance(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2)
  return Math.min(diff, 360 - diff)
}

/**
 * RGB感知距离计算
 */
function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const rMean = (r1 + r2) / 2
  const rDiff = r1 - r2
  const gDiff = g1 - g2
  const bDiff = b1 - b2
  return Math.sqrt(
    (2 + rMean / 256) * rDiff * rDiff +
    4 * gDiff * gDiff +
    (2 + (255 - rMean) / 256) * bDiff * bDiff
  )
}

/**
 * 颜色相似度判断：综合RGB距离和色相距离
 * 对于高饱和颜色，优先使用色相距离
 */
function isColorSimilar(c1: ColorInfo, c2: ColorInfo): boolean {
  // RGB感知距离
  const rgbDist = colorDistance(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b)

  // 如果两个颜色都是高饱和，使用色相距离判断
  if (c1.saturation > 50 && c2.saturation > 50) {
    const hueDist = hueDistance(c1.hue, c2.hue)
    // 色相接近（<30度）且RGB距离不太远
    return hueDist < 30 && rgbDist < 80
  }

  // 否则使用RGB距离
  return rgbDist < 35
}

export function useColorExtract() {
  const extractedColors = ref<ExtractedColors>({
    primary: '#F5F0EB',
    palette: [],
    isDarkScene: false,
  })

  const currentStrategy = ref<DesaturationStrategy>('none')

  const extractColors = (
    imageSrc: string,
    strategy: DesaturationStrategy = 'none',
  ): Promise<ExtractedColors> => {
    currentStrategy.value = strategy
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

        // 改进1：提高采样分辨率，保持原始宽高比
        const sampleSize = 150
        const aspectRatio = img.naturalWidth / img.naturalHeight
        
        let drawWidth: number
        let drawHeight: number
        
        if (aspectRatio > 1) {
          // 宽图：宽度固定为 sampleSize，高度按比例缩放
          drawWidth = sampleSize
          drawHeight = Math.round(sampleSize / aspectRatio)
        } else {
          // 高图：高度固定为 sampleSize，宽度按比例缩放
          drawHeight = sampleSize
          drawWidth = Math.round(sampleSize * aspectRatio)
        }
        
        canvas.width = drawWidth
        canvas.height = drawHeight
        ctx.drawImage(img, 0, 0, drawWidth, drawHeight)

        const imageData = ctx.getImageData(0, 0, drawWidth, drawHeight)
        const data = imageData.data

        // 改进2：使用更精细的量化步长（8 代替 16）
        const quantStep = 8
        const colorMap = new Map<string, ColorInfo>()
        let totalBrightness = 0
        let totalSaturation = 0
        let pixelCount = 0
        let brightPixelCount = 0
        let highSatPixelCount = 0

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]!
          const g = data[i + 1]!
          const b = data[i + 2]!
          const a = data[i + 3]!
          if (a < 128) continue

          // 跳过接近白色的像素（背景/天空过曝区域）
          if (r > 250 && g > 250 && b > 250) continue

          const brightness = (r + g + b) / 3
          const hsl = rgbToHsl(r, g, b)
          totalBrightness += brightness
          totalSaturation += hsl.s
          pixelCount++

          if (brightness > 150) brightPixelCount++
          if (hsl.s > 40) highSatPixelCount++

          // 改进2：精细量化
          const quantizedR = Math.min(255, Math.round((r as number) / quantStep) * quantStep)
          const quantizedG = Math.min(255, Math.round((g as number) / quantStep) * quantStep)
          const quantizedB = Math.min(255, Math.round((b as number) / quantStep) * quantStep)
          const key = `${quantizedR},${quantizedG},${quantizedB}`

          const existing = colorMap.get(key)
          if (existing) {
            existing.count++
          } else {
            // 使用原始RGB值计算HSL，避免量化导致的色相错误
            const originalHsl = rgbToHsl(r, g, b)
            colorMap.set(key, {
              count: 1,
              brightness,
              saturation: originalHsl.s,
              hue: originalHsl.h,
              lightness: originalHsl.l,
              r: quantizedR,
              g: quantizedG,
              b: quantizedB,
            })
          }
        }

        const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 128
        const avgSaturation = pixelCount > 0 ? totalSaturation / pixelCount : 0
        const isDarkScene = avgBrightness < 80 && brightPixelCount > pixelCount * 0.05

        // 转换颜色映射为数组
        const allColors = Array.from(colorMap.entries()).map(([key, info]) => ({
          key,
          ...info,
        }))

        // 调试：输出高饱和颜色
        const highSatDebug = allColors
          .filter(c => c.saturation > 40)
          .sort((a, b) => b.saturation - a.saturation)
          .slice(0, 10)
        console.log('[ColorExtract] High saturation colors:', highSatDebug.map(c => ({
          hex: rgbToHex(c.r, c.g, c.b),
          sat: Math.round(c.saturation),
          light: Math.round(c.lightness),
          count: c.count,
        })))
        console.log('[ColorExtract] Total colors:', allColors.length, 'AvgSat:', avgSaturation.toFixed(1))

        // 找出最大计数用于归一化
        const maxCount = Math.max(...allColors.map(c => c.count), 1)

        // 改进3：按视觉显著性排序（不只是像素数量）
        // 第一轮：无差异奖励，获取基础排序
        let scoredColors = allColors.map(c => ({
          ...c,
          visualScore: calculateVisualScore(c, maxCount),
        }))

        // 先按视觉分数排序
        scoredColors.sort((a, b) => b.visualScore - a.visualScore)

        // 夜景处理：优先选择高亮区域的颜色
        let candidateColors = scoredColors
        if (isDarkScene) {
          const brightColors = scoredColors.filter(c => c.brightness > 100 && c.saturation > 20)
          if (brightColors.length >= 6) {
            candidateColors = brightColors
          }
        }

        // 改进4：高饱和颜色保护 - 最多保留2个高饱和色
        const highSatColors = scoredColors
          .filter(c => c.saturation > 45 && c.lightness > 25 && c.lightness < 90)
          .sort((a, b) => b.saturation - a.saturation)
          .slice(0, 2)

        // 改进5：暖色调保护 - 仅在图片中存在显著暖色区域时启用，最多1个
        const warmPixelRatio = allColors
          .filter(c => {
            const isWarm = (c.hue >= 0 && c.hue <= 70) || c.hue >= 330
            return isWarm && c.saturation > 30
          })
          .reduce((sum, c) => sum + c.count, 0) / pixelCount

        const hasSignificantWarmColors = warmPixelRatio > 0.08

        let warmColors: typeof scoredColors = []
        if (hasSignificantWarmColors) {
          warmColors = scoredColors
            .filter(c => {
              const isWarm = (c.hue >= 0 && c.hue <= 70) || c.hue >= 330
              return isWarm && c.saturation > 30 && c.lightness > 30 && c.lightness < 85
            })
            .sort((a, b) => b.visualScore - a.visualScore)
            .slice(0, 1)
        }

        // 改进6：冷色调保护 - 仅在图片中存在显著冷色区域时启用，最多2个
        const coolPixelRatio = allColors
          .filter(c => {
            const isCool = c.hue >= 180 && c.hue <= 260
            return isCool && c.saturation > 15
          })
          .reduce((sum, c) => sum + c.count, 0) / pixelCount

        const hasSignificantCoolColors = coolPixelRatio > 0.03

        let coolColors: typeof scoredColors = []
        if (hasSignificantCoolColors) {
          coolColors = scoredColors
            .filter(c => {
              const isCool = c.hue >= 180 && c.hue <= 260
              return isCool && c.saturation > 15 && c.lightness > 25 && c.lightness < 85
            })
            .sort((a, b) => b.visualScore - a.visualScore)
            .slice(0, 2)
        }

        // 合并保护颜色（去重）
        const protectedColors: typeof scoredColors = []
        const protectedKeys = new Set<string>()

        for (const c of highSatColors) {
          const key = `${c.r},${c.g},${c.b}`
          if (!protectedKeys.has(key)) {
            protectedColors.push(c)
            protectedKeys.add(key)
          }
        }

        if (hasSignificantWarmColors) {
          for (const c of warmColors) {
            const key = `${c.r},${c.g},${c.b}`
            if (!protectedKeys.has(key)) {
              protectedColors.push(c)
              protectedKeys.add(key)
            }
          }
        }

        if (hasSignificantCoolColors) {
          for (const c of coolColors) {
            const key = `${c.r},${c.g},${c.b}`
            if (!protectedKeys.has(key)) {
              protectedColors.push(c)
              protectedKeys.add(key)
            }
          }
        }

        // 去重并选择差异明显的颜色
        const uniqueColors: string[] = []
        const selectedInfos: ColorInfo[] = []

        // 优先添加受保护的颜色（高饱和 + 暖色调）
        for (const c of protectedColors) {
          if (uniqueColors.length >= 6) break
          const hex = rgbToHex(c.r, c.g, c.b)

          const isSimilar = selectedInfos.some(existing => isColorSimilar(c, existing))

          if (!isSimilar) {
            uniqueColors.push(hex)
            selectedInfos.push(c)
          }
        }

        // 然后从候选颜色中补充（使用色相差异奖励重新排序）
        const selectedHues = selectedInfos.map(c => c.hue)
        const remainingColors = candidateColors.filter(c => {
          const hex = rgbToHex(c.r, c.g, c.b)
          return !uniqueColors.includes(hex)
        })

        // 重新计算视觉分数（加入色相差异奖励）
        const diversifiedColors = remainingColors.map(c => ({
          ...c,
          visualScore: calculateVisualScore(c, maxCount, selectedHues),
        })).sort((a, b) => b.visualScore - a.visualScore)

        for (const c of diversifiedColors) {
          if (uniqueColors.length >= 6) break
          const hex = rgbToHex(c.r, c.g, c.b)

          const isSimilar = selectedInfos.some(existing => isColorSimilar(c, existing))

          if (!isSimilar) {
            uniqueColors.push(hex)
            selectedInfos.push(c)
            selectedHues.push(c.hue)
          }
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

        // 根据策略应用降饱和处理
        let finalColors: string[]
        switch (strategy) {
          case 'none':
            finalColors = applyStrategyNone(uniqueColors)
            break
          case 'adaptive':
            finalColors = applyStrategyAdaptive(uniqueColors, avgSaturation)
            break
          case 'smart':
            finalColors = applyStrategySmart(uniqueColors)
            break
          default:
            finalColors = applyStrategyNone(uniqueColors)
        }

        const primary = finalColors[0] || '#F5F0EB'

        extractedColors.value = {
          primary,
          palette: finalColors,
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
    currentStrategy,
  }
}
