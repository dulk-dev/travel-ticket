import { ref } from 'vue'
import html2canvas from 'html2canvas'

export function useTicketExport() {
  const isExporting = ref(false)
  const exportError = ref<string | null>(null)

  const exportTicket = async (
    element: HTMLElement,
    format: 'png' | 'jpg' = 'png',
    postProcess?: (canvas: HTMLCanvasElement) => void,
  ): Promise<string | null> => {
    isExporting.value = true
    exportError.value = null

    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      })

      // 导出后处理（如补回 html2canvas 不支持的 mask 镂空）
      postProcess?.(canvas)

      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'
      const quality = format === 'jpg' ? 0.92 : undefined
      const dataUrl = canvas.toDataURL(mimeType, quality)

      isExporting.value = false
      return dataUrl
    } catch (err) {
      console.error('[useTicketExport] html2canvas failed:', err)
      exportError.value = '导出失败，请重试'
      isExporting.value = false
      return null
    }
  }

  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return {
    isExporting,
    exportError,
    exportTicket,
    downloadImage,
  }
}
