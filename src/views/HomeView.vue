<template>
  <div
    class="min-h-screen transition-colors duration-700 ease-out flex items-center justify-center p-4 md:p-8"
    :style="{ backgroundColor: pageBgColor }"
  >
    <!-- 隐藏的文件输入，用于重新上传 -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleUpload"
    />
    <!-- 电脑端：左右分栏 -->
    <div class="hidden md:flex w-full max-w-6xl gap-8 items-start">
      <!-- 左侧：票根编辑区域 -->
      <div class="flex-1 flex flex-col gap-6">
        <!-- 上方：票根预览 -->
        <div class="flex justify-center">
          <TicketCard
            ref="ticketCardRef"
            :image-src="imageSrc"
            :info="ticketInfo"
            :primary-color="primaryColor"
            :paper-type="paperType"
            :page-bg-color="pageBgColor"
            @upload="handleUpload"
            @drop="handleDrop"
          />
        </div>

        <!-- 下方：主题色预览 + 候选色板（横向排列） -->
        <div class="flex justify-center">
          <ThemeColorPanel
            :primary-color="primaryColor"
            :color-palette="colorPalette"
            :selected-color="selectedColor"
            :disabled="!hasImage"
            :text-color="pageTextColor"
            @select="handleColorSelect"
          />
        </div>

        <!-- 纸质选择：暂只保留水彩纸效果，入口暂时屏蔽（组件代码保留，未来可恢复） -->
        <!-- <div class="flex justify-center">
          <PaperTexturePanel v-model="paperType" :text-color="pageTextColor" />
        </div> -->
      </div>

      <!-- 右侧：票根信息编辑区域 -->
      <div class="w-80 shrink-0 space-y-6">
        <!-- 信息编辑 -->
        <InfoEditor
          v-model="ticketInfo"
          :text-color="pageTextColor"
        />

        <!-- 下载按钮 -->
        <button
          @click="downloadTicket('jpg')"
          :disabled="isExporting"
          class="w-full px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
          :style="{
            backgroundColor: primaryColor,
            color: textColor,
          }"
        >
          {{ isExporting ? '导出中...' : '保存票根' }}
        </button>

        <!-- 重新上传按钮 -->
        <button
          @click="triggerUpload"
          :disabled="isExporting"
          class="w-full px-4 py-3 rounded-lg font-medium text-sm border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
          :style="{
            borderColor: pageTextColor + '40',
            color: pageTextColor + '99',
            backgroundColor: 'transparent',
          }"
        >
          重新上传照片
        </button>
      </div>
    </div>

    <!-- 移动端：上下分栏 -->
    <div class="flex md:hidden flex-col w-full max-w-lg gap-6">      <!-- 上方票根预览 -->
      <div class="flex justify-center">
        <TicketCard
          ref="ticketCardRefMobile"
          :image-src="imageSrc"
          :info="ticketInfo"
          :primary-color="primaryColor"
          :paper-type="paperType"
          :page-bg-color="pageBgColor"
          photo-width="58%"
          @upload="handleUpload"
          @drop="handleDrop"
        />
      </div>

      <!-- 提示 -->
      <p class="text-center text-xs opacity-60" :style="{ color: pageTextColor }">
        双指缩放 · 拖动调整位置
      </p>

      <!-- 下方编辑面板 -->
      <div class="space-y-5 bg-white/10 rounded-2xl p-5 backdrop-blur-sm">
        <!-- 主题色预览 -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium" :style="{ color: pageTextColor }">主题色预览</label>
          <div class="h-6 rounded-lg" :style="{ backgroundColor: primaryColor }"></div>
        </div>

        <!-- 候选色板 -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium" :style="{ color: pageTextColor }">候选色板</label>
          <ColorPalette
            v-model="selectedColor"
            :colors="colorPalette"
            :disabled="!hasImage"
            @select="handleColorSelect"
          />
        </div>

        <!-- 纸质选择：暂只保留水彩纸效果，入口暂时屏蔽（组件代码保留，未来可恢复） -->
        <!-- <div class="flex flex-col gap-1">
          <PaperTexturePanel v-model="paperType" :text-color="pageTextColor" />
        </div> -->

        <!-- 信息编辑 -->
        <InfoEditor
          v-model="ticketInfo"
          :text-color="pageTextColor"
        />

        <!-- 下载按钮 -->
        <button
          @click="downloadTicket('jpg')"
          :disabled="isExporting"
          class="w-full px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          :style="{
            backgroundColor: primaryColor,
            color: textColor,
          }"
        >
          {{ isExporting ? '导出中...' : '保存票根' }}
        </button>

        <!-- 重新上传按钮 -->
        <button
          @click="triggerUpload"
          :disabled="isExporting"
          class="w-full px-4 py-3 rounded-lg font-medium text-sm border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          :style="{
            borderColor: pageTextColor + '40',
            color: pageTextColor + '99',
            backgroundColor: 'transparent',
          }"
        >
          重新上传照片
        </button>
      </div>
    </div>

    <!-- 导出专用实例：常驻离屏（非 display:none），固定 900px 设计宽度布局。
         导出直接克隆它，可视票根不做任何尺寸切换（避免导出瞬间闪跳）；
         它始终有真实布局，ResizeObserver 烘焙值始终为 900px 状态，天然与窗口尺寸解耦。 -->
    <div
      class="fixed top-0 -left-[10000px] w-[900px] pointer-events-none"
      aria-hidden="true"
    >
      <TicketCard
        ref="exportCardRef"
        :image-src="imageSrc"
        :info="ticketInfo"
        :primary-color="primaryColor"
        :paper-type="paperType"
        :page-bg-color="pageBgColor"
        :photo-width="isDesktop ? '65%' : '58%'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import TicketCard from '@/components/TicketCard/index.vue'
import ColorPalette from '@/components/ColorPalette/index.vue'
import InfoEditor from '@/components/InfoEditor/index.vue'
import ThemeColorPanel from '@/components/ThemeColorPanel/index.vue'
// 纸质选择面板已屏蔽，保留组件代码（入口恢复时取消下方注释）
// import PaperTexturePanel from '@/components/PaperTexturePanel/index.vue'
import { useImageUpload, type UploadResult } from '@/composables/useImageUpload'
import {
  useColorExtract,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToHex,
  type DesaturationStrategy,
} from '@/composables/useColorExtract'
import { useTicketExport } from '@/composables/useTicketExport'
import { useMockData } from '@/composables/useMockData'
import type { TicketInfo } from '@/composables/useMockData'
import type { PaperType } from '@/composables/usePaperTexture'

const DEFAULT_COLOR = '#DCE9F5'

const imageSrc = ref('')
const hasImage = ref(false)
const selectedColor = ref(DEFAULT_COLOR)
const ticketCardRef = ref<InstanceType<typeof TicketCard> | null>(null)
const ticketCardRefMobile = ref<InstanceType<typeof TicketCard> | null>(null)
const exportCardRef = ref<InstanceType<typeof TicketCard> | null>(null)
// 导出实例的照片区比例跟随当前可见布局（桌面 65% / 移动 58%），保证取景一致
const isDesktop = ref(window.matchMedia('(min-width: 768px)').matches)
const colorStrategy = ref<DesaturationStrategy>('none')
// 纸质纹理：默认水彩纸
const paperType = ref<PaperType>('watercolor')

const ticketInfo = ref<TicketInfo>({
  location: '杭州',
  date: '2026-04-15',
  code: '260415',
  randomCode: 'X5UJ5LDI',
})

const fileInputRef = ref<HTMLInputElement | null>(null)

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
  // 页面背景与票根同色相，加深降饱和让票根凸显。
  // 明度取中间区间（避免过深显沉闷），饱和度带上下限：
  // 下限 22 保证低饱和主题色（如浅蓝纸面）也能透出旅途活力，上限 45 防止高饱和主色刺眼
  const { r, g, b } = hexToRgb(primaryColor.value)
  const hsl = rgbToHsl(r, g, b)
  const bgL = Math.min(hsl.l * 0.5, 46)
  const bgS = Math.min(Math.max(hsl.s * 0.55, 22), 45)
  const rgb = hslToRgb(hsl.h, bgS, bgL)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
})

// 页面上文字颜色：跟随页面背景亮度取对比色（背景加深后基本恒为浅色文字）
const pageTextColor = computed(() => {
  const { r, g, b } = hexToRgb(pageBgColor.value)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128 ? '#2C2C2C' : '#F5F0EB'
})

const applyExifData = (exifData: Partial<TicketInfo>) => {
  if (exifData.date) {
    ticketInfo.value.date = exifData.date
    // 编号与日期保持同步（YYMMDD）
    ticketInfo.value.code = exifData.date.slice(2).replaceAll('-', '')
  }
  if (exifData.location) ticketInfo.value.location = exifData.location
}

const applyUploadResult = async (result: UploadResult) => {
  imageSrc.value = result.imageSrc
  hasImage.value = true
  applyExifData(result.exifData)
  await extractColors(result.imageSrc, colorStrategy.value)
  selectedColor.value = extractedColors.value.primary
  ticketInfo.value.randomCode = generateRandomCode()
}

const handleUpload = async (e: Event) => {
  const result = await handleInput(e)
  if (result) await applyUploadResult(result)
}

const handleDrop = async (e: DragEvent) => {
  const result = await uploadDrop(e)
  if (result) await applyUploadResult(result)
}

const handleColorSelect = (color: string) => {
  setPrimaryColor(color)
  selectedColor.value = color
}

const triggerUpload = () => {
  fileInputRef.value?.click()
}

const generateRandomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const downloadTicket = async (format: 'png' | 'jpg') => {
  // 导出目标固定为离屏的 900px 导出实例；可视实例（桌面/移动其一）仅作为取景状态来源。
  const visibleRef = [ticketCardRef.value, ticketCardRefMobile.value].find(
    (c) => (c?.getTicketElement()?.offsetWidth ?? 0) > 0,
  )
  const exportRef = exportCardRef.value
  const element = exportRef?.getTicketElement()
  if (!exportRef || !element) return

  // 同步重算烘焙值，并把用户在可视票根上的照片取景（缩放/平移）按比例映射到导出实例
  await exportRef.prepareForExport(visibleRef?.getPhotoState())

  const dataUrl = await exportTicket(element, format)
  if (dataUrl) {
    const ext = format === 'jpg' ? 'jpg' : 'png'
    downloadImage(dataUrl, `旅行票根-${ticketInfo.value.code}-${ticketInfo.value.randomCode}.${ext}`)
  }
}

onMounted(async () => {
  const mq = window.matchMedia('(min-width: 768px)')
  mq.addEventListener('change', (e) => {
    isDesktop.value = e.matches
  })
  const mockData = await generateMockData()
  ticketInfo.value = mockData
})
</script>
