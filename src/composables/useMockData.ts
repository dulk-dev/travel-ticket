import { ref, computed } from 'vue'

export interface TicketInfo {
  location: string
  date: string
  code: string
  randomCode: string
}

export interface PhotoTransform {
  scale: number
  translateX: number
  translateY: number
}

export function useMockData() {
  const getDefaultDate = (): string => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  const getDefaultCode = (): string => {
    const now = new Date()
    return `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  }

  const getRandomCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const getDefaultLocation = async (): Promise<string> => {
    try {
      const response = await fetch('https://ipapi.co/json/')
      if (response.ok) {
        const data = await response.json()
        return data.city || data.region || '未知地点'
      }
    } catch {
      // 离线模式下使用默认值
    }
    return '北京市'
  }

  const generateMockData = async (): Promise<TicketInfo> => {
    const location = await getDefaultLocation()
    return {
      location,
      date: getDefaultDate(),
      code: getDefaultCode(),
      randomCode: getRandomCode(),
    }
  }

  return {
    getDefaultDate,
    getDefaultCode,
    getRandomCode,
    getDefaultLocation,
    generateMockData,
  }
}
