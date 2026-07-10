<template>
  <div class="flex flex-col justify-center h-full px-6 py-8" :style="{ color: textColor }">
    <div class="space-y-4">
      <div class="text-2xl font-bold tracking-wide">{{ info.location || '未知地点' }}</div>
      <div class="text-sm opacity-70">{{ info.date || '2026-07-10' }}</div>
      <div class="text-lg font-mono tracking-widest">{{ info.code || '260710' }}</div>
      <div class="text-sm font-mono opacity-60">{{ info.randomCode || 'X8K2M' }}</div>
    </div>
    <div class="mt-6">
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
