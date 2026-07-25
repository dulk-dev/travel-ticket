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

  // 小工具纯本地不联网，默认城市固定写死
  const getDefaultLocation = (): string => '北京市'

  const generateMockData = (): TicketInfo => ({
    location: getDefaultLocation(),
    date: getDefaultDate(),
    code: getDefaultCode(),
    randomCode: getRandomCode(),
  })

  return {
    getDefaultDate,
    getDefaultCode,
    getRandomCode,
    getDefaultLocation,
    generateMockData,
  }
}
