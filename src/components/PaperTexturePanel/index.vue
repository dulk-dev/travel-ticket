<template>
  <div class="flex items-center gap-4">
    <span class="text-sm font-medium shrink-0" :style="{ color: textColor }">纸质</span>
    <div class="flex flex-wrap gap-3">
      <button
        v-for="option in options"
        :key="option.value"
        class="w-10 h-10 rounded-full transition-all duration-200 border-2 overflow-hidden relative"
        :class="{
          'border-white shadow-lg scale-110': modelValue === option.value,
          'border-gray-300 hover:scale-105': modelValue !== option.value,
        }"
        :style="swatchStyle(option.value)"
        :title="option.label"
        @click="select(option.value)"
      >
        <!-- 无纹理：斜杠标识 -->
        <span
          v-if="option.value === 'none'"
          class="absolute inset-0 flex items-center justify-center text-gray-400 text-lg font-light select-none"
        >∅</span>
      </button>
    </div>
    <!-- 当前纸种名称 -->
    <span class="text-xs opacity-70 shrink-0" :style="{ color: textColor }">
      {{ currentLabel }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PAPER_OPTIONS, type PaperType } from '@/composables/usePaperTexture'
import watercolorUrl from '@/assets/textures/watercolor.jpg'
import linenUrl from '@/assets/textures/linen.jpg'
import cottonUrl from '@/assets/textures/cotton.jpg'
import pearlUrl from '@/assets/textures/pearl.jpg'
import parchmentUrl from '@/assets/textures/parchment.jpg'

interface Props {
  modelValue: PaperType
  textColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  textColor: '#2C2C2C',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: PaperType): void
}>()

const options = PAPER_OPTIONS

const TEXTURE_SWATCHES: Record<Exclude<PaperType, 'none'>, string> = {
  watercolor: watercolorUrl,
  linen: linenUrl,
  cotton: cottonUrl,
  pearl: pearlUrl,
  parchment: parchmentUrl,
}

const swatchStyle = (value: PaperType) => {
  if (value === 'none') {
    return { backgroundColor: '#F3F4F6' }
  }
  return {
    backgroundImage: `url(${TEXTURE_SWATCHES[value]})`,
    backgroundSize: 'cover',
    backgroundColor: '#F3F4F6',
  }
}

const currentLabel = computed(() => {
  return options.find(o => o.value === props.modelValue)?.label || ''
})

const select = (value: PaperType) => {
  emit('update:modelValue', value)
}
</script>
