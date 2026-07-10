<template>
  <div
    class="min-h-screen transition-colors duration-700 ease-out flex items-center justify-center p-4 md:p-8"
    :style="{ backgroundColor: pageBgColor }"
  >
    <!-- 电脑端：左右分栏 -->
    <div class="hidden md:flex w-full max-w-6xl gap-8 items-center">
      <!-- 左侧票根预览 -->
      <div class="flex-1 flex justify-center">
        <TicketCard
          ref="ticketCardRef"
          :image-src="imageSrc"
          :info="ticketInfo"
          :primary-color="primaryColor"
          @upload="handleUpload"
          @drop="handleDrop"
        />
      </div>

      <!-- 右侧编辑面板 -->
      <div class="w-80 shrink-0 space-y-6">
        <!-- 主题色预览 -->
        <div class="space-y-3">
          <label class="text-sm font-medium" :style="{ color: textColor }">主题色预览</label>
          <div class="h-8 rounded-lg" :style="{ backgroundColor: primaryColor }"></div>
        </div>

        <!-- 候选色板 -->
        <div class="space-y-3">
          <label class="text-sm font-medium" :style="{ color: textColor }">候选色板</label>
          <ColorPalette
            v-model="selectedColor"
            :colors="colorPalette"
            :disabled="!hasImage"
            @select="handleColorSelect"
          />
        </div>

        <!-- 信息编辑 -->
        <div class="space-y-3">
          <label class="text-sm font-medium" :style="{ color: textColor }">票根信息</label>
          <InfoEditor
            v-model="ticketInfo"
            :disabled="!hasImage"
            :text-color="textColor"
          />
        </div>

        <!-- 条形码 -->
        <div class="pt-2">
          <Barcode :value="ticketInfo.code" :color="textColor" />
        </div>

        <!-- 下载按钮 -->
        <div class="flex gap-3 pt-4">
          <button
            @click="downloadTicket('png')"
            :disabled="isExporting"
            class="flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            :style="{
              backgroundColor: textColor,
              color: primaryColor,
            }"
          >
            {{ isExporting ? '导出中...' : '下载 PNG' }}
          </button>
          <button
            @click="downloadTicket('jpg')"
            :disabled="isExporting"
            class="flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            :style="{
              backgroundColor: textColor,
              color: primaryColor,
            }"
          >
            {{ isExporting ? '导出中...' : '下载 JPG' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 移动端：上下分栏 -->
    <div class="flex md:hidden flex-col w-full max-w-md gap-6">
      <!-- 上方票根预览 -->
      <div class="flex justify-center">
        <TicketCard
          ref="ticketCardRefMobile"
          :image-src="imageSrc"
          :info="ticketInfo"
          :primary-color="primaryColor"
          photo-width="45%"
          @upload="handleUpload"
          @drop="handleDrop"
        />
      </div>

      <!-- 提示 -->
      <p class="text-center text-xs opacity-60" :style="{ color: textColor }">
        双指缩放 · 拖动调整位置
      </p>

      <!-- 下方编辑面板 -->
      <div class="space-y-5 bg-white/10 rounded-2xl p-5 backdrop-blur-sm">
        <!-- 主题色预览 -->
        <div class="space-y-2">
          <label class="text-sm font-medium" :style="{ color: textColor }">主题色预览</label>
          <div class="h-6 rounded-lg" :style="{ backgroundColor: primaryColor }"></div>
        </div>

        <!-- 候选色板 -->
        <div class="space-y-2">
          <label class="text-sm font-medium" :style="{ color: textColor }">候选色板</label>
          <ColorPalette
            v-model="selectedColor"
            :colors="colorPalette"
            :disabled="!hasImage"
            @select="handleColorSelect"
          />
        </div>

        <!-- 信息编辑 -->
        <div class="space-y-2">
          <label class="text-sm font-medium" :style="{ color: textColor }">票根信息</label>
          <InfoEditor
            v-model="ticketInfo"
            :disabled="!hasImage"
            :text-color="textColor"
          />
        </div>

        <!-- 条形码 -->
        <div>
          <Barcode :value="ticketInfo.code" :color="textColor" />
        </div>

        <!-- 下载按钮 -->
        <div class="flex gap-3 pt-2">
          <button
            @click="downloadTicket('png')"
            :disabled="isExporting"
            class="flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            :style="{
              backgroundColor: textColor,
              color: primaryColor,
            }"
          >
            {{ isExporting ? '导出中...' : 'PNG' }}
          </button>
          <button
            @click="downloadTicket('jpg')"
            :disabled="isExporting"
            class="flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            :style="{
              backgroundColor: textColor,
              color: primaryColor,
            }"
          >
            {{ isExporting ? '导出中...' : 'JPG' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import TicketCard from '@/components/TicketCard/index.vue'
import ColorPalette from '@/components/ColorPalette/index.vue'
import InfoEditor from '@/components/InfoEditor/index.vue'
import Barcode from '@/components/Barcode/index.vue'
import { useImageUpload } from '@/composables/useImageUpload'
import { useColorExtract } from '@/composables/useColorExtract'
import { useTicketExport } from '@/composables/useTicketExport'
import { useMockData } from '@/composables/useMockData'
import type { TicketInfo } from '@/composables/useMockData'

const DEFAULT_COLOR = '#F5F0EB'

const imageSrc = ref('')
const hasImage = ref(false)
const selectedColor = ref(DEFAULT_COLOR)
const ticketCardRef = ref<InstanceType<typeof TicketCard> | null>(null)
const ticketCardRefMobile = ref<InstanceType<typeof TicketCard> | null>(null)

const ticketInfo = ref<TicketInfo>({
  location: '北京市',
  date: '2026-07-10',
  code: '260710',
  randomCode: 'X8K2M',
})

const { handleInput, handleDrop: uploadDrop } = useImageUpload()
const { extractedColors, extractColors, setPrimaryColor } = useColorExtract()
const { isExporting, exportTicket, downloadImage } = useTicketExport()
const { generateMockData } = useMockData()

const primaryColor = computed(() => extractedColors.value.primary || DEFAULT_COLOR)
const colorPalette = computed(() => {
  const palette = extractedColors.value.palette || []
  if (palette.length === 0) {
    // 未上传时显示 6 个灰色占位圆圈
    return Array(6).fill('#D1D5DB')
  }
  return palette
})

const textColor = computed(() => {
  const hex = primaryColor.value.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128 ? '#2C2C2C' : '#F5F0EB'
})

const pageBgColor = computed(() => {
  // 背景板比票根区域更深
  const hex = primaryColor.value.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const darken = (c: number) => Math.max(0, Math.round(c * 0.85))
  return `#${[darken(r), darken(g), darken(b)].map(c => c.toString(16).padStart(2, '0')).join('')}`
})

const handleUpload = async (e: Event) => {
  const result = await handleInput(e)
  if (result) {
    imageSrc.value = result.imageSrc
    hasImage.value = true
    if (result.exifData.date) ticketInfo.value.date = result.exifData.date
    await extractColors(result.imageSrc)
    selectedColor.value = extractedColors.value.primary
    ticketInfo.value.randomCode = generateRandomCode()
  }
}

const handleDrop = async (e: DragEvent) => {
  const result = await uploadDrop(e)
  if (result) {
    imageSrc.value = result.imageSrc
    hasImage.value = true
    if (result.exifData.date) ticketInfo.value.date = result.exifData.date
    await extractColors(result.imageSrc)
    selectedColor.value = extractedColors.value.primary
    ticketInfo.value.randomCode = generateRandomCode()
  }
}

const handleColorSelect = (color: string) => {
  setPrimaryColor(color)
  selectedColor.value = color
}

const generateRandomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const downloadTicket = async (format: 'png' | 'jpg') => {
  const cardRef = ticketCardRef.value || ticketCardRefMobile.value
  const element = cardRef?.getTicketElement()
  if (!element) return

  const dataUrl = await exportTicket(element, format)
  if (dataUrl) {
    const ext = format === 'jpg' ? 'jpg' : 'png'
    downloadImage(dataUrl, `旅行票根-${ticketInfo.value.code}-${ticketInfo.value.randomCode}.${ext}`)
  }
}

onMounted(async () => {
  const mockData = await generateMockData()
  ticketInfo.value = mockData
})
</script>
