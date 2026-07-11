<template>
  <div class="w-full h-12 flex items-center justify-start overflow-hidden">
    <svg ref="barcodeRef" class="h-full" style="width: auto;"></svg>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import JsBarcode from 'jsbarcode'

interface Props {
  value: string
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  color: '#2C2C2C',
})

const barcodeRef = ref<SVGSVGElement | null>(null)

const renderBarcode = () => {
  if (!barcodeRef.value) return

  try {
    JsBarcode(barcodeRef.value, props.value || '000000', {
      format: 'CODE128',
      width: 1.5,
      height: 36,
      displayValue: false,
      lineColor: props.color,
      background: 'transparent',
      margin: 0,
    })
  } catch (err) {
    console.error('Barcode render failed:', err)
  }
}

onMounted(() => {
  renderBarcode()
})

watch(() => [props.value, props.color], () => {
  renderBarcode()
})
</script>
