import { useCanvasExport, type CanvasExportParams } from './useCanvasExport'

export function useTicketExport() {
  const { isExporting, exportError, exportTicket: canvasExport } = useCanvasExport()

  const exportTicket = async (params: CanvasExportParams): Promise<string | null> => {
    return canvasExport(params)
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
