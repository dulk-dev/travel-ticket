<template>
  <!-- 通过容器高度计算字体大小，实现真正的自适应缩放 -->
  <!-- 基准字号 = 容器高度的 6%，地点字号 = 基准的 2.0 倍 = 容器高度的 12%，两行约 24% -->
  <div
    ref="infoAreaRef"
    class="flex flex-col justify-center h-full px-[4%] py-[3%]"
    :style="{ color: textColor, fontSize: baseFontSize + 'px' }"
  >
    <div class="flex flex-col gap-[0.3em]">
      <!-- 地点：两行显示，字号最大，字间距最宽，字重最粗 -->
      <div class="font-black tracking-[0.12em] leading-[1.05]" style="font-size: 2.0em;">
        <div>{{ locationLines[0] }}</div>
        <div>{{ locationLines[1] }}</div>
      </div>
      <!-- 日期：字号为基准的 1.15 倍 -->
      <div class="font-medium tracking-[0.06em] opacity-85" style="font-size: 1.15em;">
        {{ formatDate(info.date) }}
      </div>
      <!-- 编号：等宽字体，字间距宽，字号为基准的 0.95 倍 -->
      <div class="font-mono tracking-[0.1em] opacity-90" style="font-size: 0.95em;">
        {{ formatCode(info.code, info.date) }}
      </div>
      <!-- 随机码：等宽字体，字间距宽，与编号同字号 -->
      <div class="font-mono tracking-[0.1em] opacity-70" style="font-size: 0.95em;">
        {{ info.randomCode || 'X8K2M' }}
      </div>
    </div>
    <div class="mt-[0.5em]">
      <slot name="barcode" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { TicketInfo } from '@/composables/useMockData'
import { pinyin } from 'pinyin-pro'

interface Props {
  info: TicketInfo
  textColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  textColor: '#2C2C2C',
})

// 通过容器高度计算基准字号（容器高度的 10%，最小 10px）
const infoAreaRef = ref<HTMLElement | null>(null)
const baseFontSize = ref(10)

const updateFontSize = () => {
  if (!infoAreaRef.value) return
  const height = infoAreaRef.value.clientHeight
  // 基准字号 = 容器高度的 6%，最小 10px
  baseFontSize.value = Math.max(10, Math.round(height * 0.06))
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  updateFontSize()
  resizeObserver = new ResizeObserver(() => {
    updateFontSize()
  })
  if (infoAreaRef.value) {
    resizeObserver.observe(infoAreaRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

// 将地点转换为英文大写拼音，并分为两行
const locationLines = computed(() => {
  const location = props.info.location
  if (!location) return ['UNKN', 'OWN']

  // 如果包含中文字符，使用 pinyin-pro 转换，每个汉字对应一个拼音单元
  if (/[\u4e00-\u9fff]/.test(location)) {
    // 去掉"市""省""区"等后缀
    const cleanLocation = location.replace(/[市省区]/g, '')
    const pinyinUnits = pinyin(cleanLocation, { toneType: 'none', type: 'array' })
    return splitUnitsIntoTwoLines(pinyinUnits)
  }

  // 纯英文：按空格分词，每个单词作为一个不可拆分的语义单元
  const words = location.trim().toUpperCase().split(/\s+/).filter(w => w.length > 0)
  if (words.length === 0) return ['UNKN', 'OWN']
  return splitUnitsIntoTwoLines(words)
})

// 将语义单元数组均分为两行，尽量保证两行长度均衡
const splitUnitsIntoTwoLines = (units: string[]): [string, string] => {
  if (units.length === 0) return ['UNKN', 'OWN']
  if (units.length === 1) return [units[0].toUpperCase(), '']

  // 计算总长度，找到最佳分割点使两行字符长度最接近
  const totalLen = units.reduce((sum, u) => sum + u.length, 0)
  let bestSplit = 1
  let minDiff = Infinity

  for (let i = 1; i < units.length; i++) {
    const firstLen = units.slice(0, i).reduce((sum, u) => sum + u.length, 0)
    const secondLen = totalLen - firstLen
    const diff = Math.abs(firstLen - secondLen)
    if (diff < minDiff) {
      minDiff = diff
      bestSplit = i
    }
  }

  const first = units.slice(0, bestSplit).join('').toUpperCase()
  const second = units.slice(bestSplit).join('').toUpperCase()
  return [first, second]
}

// 日期格式化为 yyyy - mm
const formatDate = (date: string): string => {
  if (!date) return '2026 - 07'
  const parts = date.split('-')
  if (parts.length >= 2) {
    return `${parts[0]} - ${parts[1]}`
  }
  return date
}

// 编号格式化为 No.yyyymmdd
const formatCode = (code: string, date: string): string => {
  // 优先从 date 提取 yyyymmdd
  if (date) {
    const parts = date.split('-')
    if (parts.length >= 3) {
      return `NO.${parts[0]}${parts[1]}${parts[2]}`
    }
    if (parts.length >= 2) {
      return `NO.${parts[0]}${parts[1]}01`
    }
  }
  // 回退到 code
  if (code && code.length === 6) {
    return `NO.20${code}`
  }
  return `NO.${code || '20260701'}`
}
</script>
