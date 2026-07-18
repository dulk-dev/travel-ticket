import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export interface CardTiltOptions {
  maxTiltX?: number // 上下倾斜最大角度（度）
  maxTiltY?: number // 左右倾斜最大角度（度）
}

// 卡片 3D 倾斜 + 全息高光 hover 效果：
// 鼠标在卡片上移动时，按指针相对卡片中心的位置计算 rotateX/rotateY，模拟实体卡片的空间倾斜；
// 同时一层高光跟随指针位置，营造全息反光感。仅在支持 hover 的指针设备上启用。
export function useCardTilt(wrapperRef: Ref<HTMLElement | null>, options: CardTiltOptions = {}) {
  const { maxTiltX = 6, maxTiltY = 9 } = options

  const hoverEnabled =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches

  const isHovering = ref(false)
  // 按住拖拽（如拖动照片调整位置）时压平卡片，避免倾斜与拖拽手势互相干扰
  const isPressed = ref(false)
  const rotateX = ref(0)
  const rotateY = ref(0)
  const glareX = ref(50)
  const glareY = ref(50)
  const glareOpacity = ref(0)

  const flatten = () => {
    rotateX.value = 0
    rotateY.value = 0
  }

  const onMouseEnter = () => {
    if (!hoverEnabled) return
    isHovering.value = true
    glareOpacity.value = 1
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!hoverEnabled || isPressed.value) return
    const rect = wrapperRef.value?.getBoundingClientRect()
    if (!rect || !rect.width || !rect.height) return

    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height

    rotateY.value = (px - 0.5) * 2 * maxTiltY
    rotateX.value = -(py - 0.5) * 2 * maxTiltX
    glareX.value = px * 100
    glareY.value = py * 100
    glareOpacity.value = 1
  }

  const onMouseLeave = () => {
    isHovering.value = false
    glareOpacity.value = 0
    flatten()
  }

  const onPointerDown = () => {
    if (!hoverEnabled) return
    isPressed.value = true
    flatten()
  }

  const onPointerUp = () => {
    isPressed.value = false
  }

  onMounted(() => {
    window.addEventListener('pointerup', onPointerUp)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointerup', onPointerUp)
  })

  // hover 中快速跟随指针；离开或按压时缓慢回弹
  const tiltStyle = computed(() => ({
    transform: `perspective(1000px) rotateX(${rotateX.value}deg) rotateY(${rotateY.value}deg)`,
    transition:
      isHovering.value && !isPressed.value
        ? 'transform 0.1s ease-out'
        : 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
    willChange: 'transform',
  }))

  // 全息高光：径向白光跟随指针 + 低透明度彩虹斜向光泽（随指针水平位置偏转）
  const glareStyle = computed(() => ({
    background: [
      `radial-gradient(circle at ${glareX.value}% ${glareY.value}%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 35%, transparent 60%)`,
      `linear-gradient(${115 + (glareX.value - 50) * 0.8}deg, transparent 32%, rgba(255,190,215,0.08) 43%, rgba(190,230,255,0.08) 50%, rgba(255,245,190,0.08) 57%, transparent 68%)`,
    ].join(', '),
    opacity: glareOpacity.value,
    transition: 'opacity 0.35s ease',
  }))

  return {
    tiltStyle,
    glareStyle,
    onMouseEnter,
    onMouseMove,
    onMouseLeave,
    onPointerDown,
  }
}
