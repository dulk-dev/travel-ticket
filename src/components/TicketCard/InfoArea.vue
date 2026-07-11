<template>
  <div class="flex flex-col justify-center h-full px-5 py-6" :style="{ color: textColor }">
    <div class="space-y-3">
      <div class="text-xl font-bold tracking-wide leading-tight">{{ info.location || '未知地点' }}</div>
      <div class="text-base opacity-80">{{ info.date || '2026-07-10' }}</div>
      <div class="text-base font-mono tracking-widest opacity-90">{{ info.code || '260710' }}</div>
      <div class="text-base font-mono opacity-70">{{ info.randomCode || 'X8K2M' }}</div>
    </div>
    <div class="mt-4">
      <slot name="barcode" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TicketInfo } from '@/composables/useMockData'

interface Props {
  info: TicketInfo
  textColor?: string
}

withDefaults(defineProps<Props>(), {
  textColor: '#2C2C2C',
})
</script>
