<template>
  <div class="w-full h-full relative overflow-hidden" ref="containerRef">
    <img
      v-if="imageSrc"
      ref="imgRef"
      :src="imageSrc"
      class="absolute"
      :style="imageStyle"
      draggable="false"
      @mousedown="onMouseDown"
      @touchstart.prevent="onTouchStart"
      @load="onImageLoad"
    />
    <div
      v-else
      class="w-full h-full flex flex-col items-center justify-center"
      :class="{ 'rounded-lg': !imageSrc }"
      @dragover.prevent
      @drop="onDrop"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from "vue";
import {
  usePhotoTransform,
  type PhotoState,
} from "@/composables/usePhotoTransform";

interface Props {
  imageSrc: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "drop", event: DragEvent): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const imgRef = ref<HTMLImageElement | null>(null);
const naturalSize = ref({ width: 0, height: 0 });

const {
  transform,
  isDragging,
  baseSize,
  setBaseSize,
  reclamp,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  reset,
} = usePhotoTransform(containerRef);

const imageStyle = computed(() => ({
  position: "absolute" as const,
  inset: "0",
  margin: "auto",
  width: baseSize.value.width ? `${baseSize.value.width}px` : "100%",
  height: baseSize.value.height ? `${baseSize.value.height}px` : "100%",
  maxWidth: "none" as const,
  transform: `translate(${transform.value.translateX}px, ${transform.value.translateY}px) scale(${transform.value.scale})`,
  transformOrigin: "center center",
  cursor: isDragging.value ? "grabbing" : "grab",
  userSelect: "none" as const,
  transition: isDragging.value ? "none" : "transform 0.1s ease-out",
}));

// 计算图片铺满取景框（object-cover）后的实际渲染尺寸，使大图在 scale 1 时也可拖动
const computeBaseSize = () => {
  const container = containerRef.value?.getBoundingClientRect();
  const nw = naturalSize.value.width;
  const nh = naturalSize.value.height;
  if (!container || !container.width || !container.height || !nw || !nh) return;
  const baseScale = Math.max(container.width / nw, container.height / nh);
  setBaseSize(nw * baseScale, nh * baseScale);
  reclamp();
};

const onImageLoad = () => {
  if (!imgRef.value) return;
  naturalSize.value = {
    width: imgRef.value.naturalWidth,
    height: imgRef.value.naturalHeight,
  };
  computeBaseSize();
};

// 仅当存在图片时，监听编辑区域内的滚轮进行缩放
const handleWheel = (e: WheelEvent) => {
  if (!props.imageSrc) return;
  onWheel(e);
};

const onDrop = (e: DragEvent) => {
  emit("drop", e);
};

watch(
  () => props.imageSrc,
  () => {
    reset();
  },
);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  containerRef.value?.addEventListener("wheel", handleWheel, {
    passive: false,
  });
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
  // touch 事件绑定在 window，保证手指移出取景框时仍可持续拖拽/缩放
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd);
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => computeBaseSize());
    resizeObserver.observe(containerRef.value);
  }
});

onBeforeUnmount(() => {
  containerRef.value?.removeEventListener("wheel", handleWheel);
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
  window.removeEventListener("touchmove", onTouchMove);
  window.removeEventListener("touchend", onTouchEnd);
  resizeObserver?.disconnect();
});

// 导出前同步重算图片铺满尺寸（理由同 InfoArea.recompute）
const recompute = () => {
  computeBaseSize();
};

// 读取当前取景状态（含铺满基准尺寸），供导出实例做比例映射
const getPhotoState = (): PhotoState => ({
  scale: transform.value.scale,
  translateX: transform.value.translateX,
  translateY: transform.value.translateY,
  baseWidth: baseSize.value.width,
  baseHeight: baseSize.value.height,
});

// 将另一实例的取景状态按基准尺寸比例映射到本实例（保持同一取景构图）
const applyPhotoState = (state: PhotoState) => {
  if (
    !state.baseWidth ||
    !state.baseHeight ||
    !baseSize.value.width ||
    !baseSize.value.height
  )
    return;
  transform.value = {
    scale: state.scale,
    translateX: (state.translateX * baseSize.value.width) / state.baseWidth,
    translateY: (state.translateY * baseSize.value.height) / state.baseHeight,
  };
  reclamp();
};

defineExpose({
  recompute,
  getPhotoState,
  applyPhotoState,
});
</script>
