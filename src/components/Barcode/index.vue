<template>
  <div class="w-full h-12 flex items-center justify-center overflow-hidden">
    <svg ref="barcodeRef" class="w-full h-full"></svg>
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
      width: 2,
      height: 40,
      displayValue: false,
      lineColor: props.color,
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
