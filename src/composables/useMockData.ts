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
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 6000)
      const fetchIp = async (lang?: string) => {
        const response = await fetch(`https://ipwho.is/${lang ? `?lang=${lang}` : ''}`, {
          signal: controller.signal,
        })
        if (!response.ok) return null
        const data = await response.json()
        return data.success ? data : null
      }
      // 国内用中文地名，国外用英文地名
      const en = await fetchIp()
      const zh = en?.country_code === 'CN' ? await fetchIp('zh-CN') : null
      clearTimeout(timer)
      const data = zh || en
      if (data) return data.city || data.region || '未知地点'
    } catch {
      // 离线或接口不可用时使用默认值
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
