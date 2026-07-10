import { ref } from 'vue'
import type { TicketInfo } from './useMockData'

export interface UploadResult {
  imageSrc: string
  exifData: Partial<TicketInfo>
}

export function useImageUpload() {
  const isUploading = ref(false)
  const uploadError = ref<string | null>(null)

  const parseExifDate = (exifDateStr: string): string => {
    // EXIF 日期格式: "2024:07:10 12:00:00"
    const match = exifDateStr.match(/(\d{4}):(\d{2}):(\d{2})/)
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`
    }
    return ''
  }

  const extractExif = (file: File): Promise<Partial<TicketInfo>> => {
    return new Promise((resolve) => {
      // 使用 EXIF.js 或简单的文件读取
      // 这里简化处理，实际项目中可以使用 exif-js 库
      const result: Partial<TicketInfo> = {}

      // 尝试从文件名提取日期
      const dateMatch = file.name.match(/(\d{4})[-_](\d{2})[-_](\d{2})/)
      if (dateMatch) {
        result.date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
      }

      resolve(result)
    })
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
    } catch (err) {
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
