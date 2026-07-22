<template>
  <!-- 高度用 em 跟随 InfoArea baseFontSize 缩放（2.4em ≈ PC 端 48px，移动端等比缩小） -->
  <div ref="containerRef" class="w-full flex items-center justify-start overflow-hidden" style="height: 2.4em;">
    <svg ref="barcodeRef" class="h-full" style="width: auto;"></svg>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import JsBarcode from 'jsbarcode'

interface Props {
  value: string
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  color: '#2C2C2C',
})

const barcodeRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)

const renderBarcode = () => {
  if (!barcodeRef.value || !containerRef.value) return
  const h = containerRef.value.clientHeight
  if (h <= 0) return

  try {
    JsBarcode(barcodeRef.value, props.value || '000000', {
      format: 'CODE128',
      width: Math.max(0.8, h / 24),
      height: Math.round(h * 0.75),
      displayValue: false,
      lineColor: props.color,
      background: 'transparent',
      margin: 0,
    })
  } catch (err) {
    console.error('Barcode render failed:', err)
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  renderBarcode()
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => renderBarcode())
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

watch(() => [props.value, props.color], () => {
  renderBarcode()
})
</script>
