import { ref } from 'vue'
import exifr from 'exifr'
import type { TicketInfo } from './useMockData'

export interface UploadResult {
  imageSrc: string
  exifData: Partial<TicketInfo>
}

export function useImageUpload() {
  const isUploading = ref(false)
  const uploadError = ref<string | null>(null)

  const formatDate = (d: Date): string => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // 小工具纯本地不联网，EXIF 仅提取日期，GPS 坐标不做逆地理编码
  const extractExif = async (file: File): Promise<Partial<TicketInfo>> => {
    const result: Partial<TicketInfo> = {}

    try {
      const exif = await exifr.parse(file)

      const takenAt: unknown = exif?.DateTimeOriginal ?? exif?.CreateDate ?? exif?.DateTime
      if (takenAt instanceof Date && !Number.isNaN(takenAt.getTime())) {
        result.date = formatDate(takenAt)
      }
    } catch {
      // 无 EXIF 或解析失败时走下方文件名兜底
    }

    // 文件名日期兜底（如 2024-07-10_xxx.jpg）
    if (!result.date) {
      const dateMatch = file.name.match(/(\d{4})[-_](\d{2})[-_](\d{2})/)
      if (dateMatch) {
        result.date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
      }
    }

    return result
  }

  const handleFile = async (file: File): Promise<UploadResult | null> => {
    if (!file.type.startsWith('image/')) {
      uploadError.value = '请上传图片文件 (JPG/PNG)'
      return null
    }

    isUploading.value = true
    uploadError.value = null

    try {
      const imageSrc = URL.createObjectURL(file)
      const exifData = await extractExif(file)

      isUploading.value = false
      return { imageSrc, exifData }
    } catch {
      uploadError.value = '图片读取失败'
      isUploading.value = false
      return null
    }
  }

  const handleDrop = async (e: DragEvent): Promise<UploadResult | null> => {
    e.preventDefault()
    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return null
    return handleFile(files[0]!)
  }

  const handleInput = async (e: Event): Promise<UploadResult | null> => {
    const target = e.target as HTMLInputElement
    const files = target.files
    if (!files || files.length === 0) return null
    return handleFile(files[0]!)
  }

  return {
    isUploading,
    uploadError,
    handleFile,
    handleDrop,
    handleInput,
  }
}
