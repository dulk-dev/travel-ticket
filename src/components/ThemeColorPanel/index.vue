<template>
  <div class="flex items-center gap-4">
    <!-- 主题色预览 -->
    <div class="flex items-center gap-2">
      <div
        class="w-10 h-10 rounded-full border-2 border-white/30 shadow-sm shrink-0"
        :style="{ backgroundColor: primaryColor }"
      ></div>
      <span class="text-sm font-medium" :style="{ color: textColor }">主题色</span>
    </div>

    <!-- 分隔线 -->
    <div class="w-px h-8 bg-current opacity-20" :style="{ color: textColor }"></div>

    <!-- 候选色板 -->
    <ColorPalette
      :model-value="selectedColor"
      :colors="colorPalette"
      :disabled="disabled"
      @select="handleColorSelect"
    />
  </div>
</template>

<script setup lang="ts">
import ColorPalette from '@/components/ColorPalette/index.vue'

interface Props {
  primaryColor: string
  colorPalette: string[]
  selectedColor?: string
  disabled?: boolean
  textColor?: string
}

withDefaults(defineProps<Props>(), {
  selectedColor: '#F5F0EB',
  disabled: false,
  textColor: '#2C2C2C',
})

const emit = defineEmits<{
  (e: 'select', color: string): void
}>()

const handleColorSelect = (color: string) => {
  emit('select', color)
}
</script>
