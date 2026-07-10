<template>
  <div class="flex flex-wrap gap-3">
    <button
      v-for="(color, index) in colors"
      :key="index"
      class="w-10 h-10 rounded-full transition-all duration-200 border-2"
      :class="{
        'border-gray-300 border-dashed': !isActive && !disabled,
        'border-gray-400 border-dashed opacity-50': disabled,
        'border-white shadow-lg scale-110': isActive && activeIndex === index && !disabled,
        'border-transparent hover:scale-105': (!isActive || activeIndex !== index) && !disabled,
      }"
      :style="{
        backgroundColor: disabled ? 'transparent' : color,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }"
      @click="!disabled && selectColor(index)"
      :disabled="disabled"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  colors: string[]
  disabled?: boolean
  modelValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', color: string): void
}>()

const activeIndex = ref(0)
const isActive = ref(false)

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    const index = props.colors.indexOf(newVal)
    if (index !== -1) {
      activeIndex.value = index
      isActive.value = true
    }
  }
}, { immediate: true })

watch(() => props.disabled, (disabled) => {
  if (disabled) {
    isActive.value = false
  }
})

const selectColor = (index: number) => {
  activeIndex.value = index
  isActive.value = true
  const color = props.colors[index] || '#F5F0EB'
  emit('update:modelValue', color)
  emit('select', color)
}
</script>
