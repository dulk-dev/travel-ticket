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

  // GPS 坐标逆地理编码为城市名（Nominatim / OSM，与 useMockData 中 IP 定位同属在线兜底策略）
  // 国内用中文地名，国外用英文地名
  const pickLocation = (addr: Record<string, string> | null): string =>
    addr?.city || addr?.town || addr?.county || addr?.village || addr?.state || ''

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 6000)
      const fetchAddr = async (lang: string): Promise<Record<string, string> | null> => {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&accept-language=${lang}`,
          { signal: controller.signal },
        )
        if (!response.ok) return null
        const data = await response.json()
        return data.address || null
      }
      const addr = await fetchAddr('en')
      const zhAddr = addr?.country_code === 'cn' ? await fetchAddr('zh') : null
      clearTimeout(timer)
      return pickLocation(zhAddr) || pickLocation(addr)
    } catch {
      // 离线、超时或接口不可用时跳过，保持原地点
    }
    return ''
  }

  const extractExif = async (file: File): Promise<Partial<TicketInfo>> => {
    const result: Partial<TicketInfo> = {}

    try {
      const exif = await exifr.parse(file)

      const takenAt: unknown = exif?.DateTimeOriginal ?? exif?.CreateDate ?? exif?.DateTime
      if (takenAt instanceof Date && !Number.isNaN(takenAt.getTime())) {
        result.date = formatDate(takenAt)
      }

      if (typeof exif?.latitude === 'number' && typeof exif?.longitude === 'number') {
        const location = await reverseGeocode(exif.latitude, exif.longitude)
        if (location) result.location = location
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
