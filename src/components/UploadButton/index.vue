<template>
  <div
    class="flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:opacity-80"
    @click="handleClick"
  >
    <div class="w-16 h-16 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center mb-3">
      <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
    <span class="text-sm text-gray-500">点击或拖拽上传照片</span>
    <span class="text-xs text-gray-400 mt-1">JPG / PNG</span>
    <input
      ref="inputRef"
      type="file"
      accept="image/jpeg,image/png"
      class="hidden"
      @change="handleChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'upload', event: Event): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)

const handleClick = () => {
  inputRef.value?.click()
}

const handleChange = (e: Event) => {
  emit('upload', e)
}
</script>
