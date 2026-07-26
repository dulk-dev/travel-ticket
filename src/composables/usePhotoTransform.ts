import { ref, type Ref } from "vue";

export interface PhotoTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

// 某一容器尺寸下的完整取景状态：变换 + 对应的铺满基准尺寸。
// 平移量是相对基准尺寸的像素值，跨容器传递时按基准尺寸比例换算即可保持取景一致。
export interface PhotoState extends PhotoTransform {
  baseWidth: number;
  baseHeight: number;
}

export function usePhotoTransform(containerRef: Ref<HTMLElement | null>) {
  const transform = ref<PhotoTransform>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const isDragging = ref(false);
  const dragStart = ref({ x: 0, y: 0 });
  const transformStart = ref({ x: 0, y: 0 });

  // 图片按 object-cover 铺满取景框后的实际渲染尺寸（可能大于取景框，从而留出可拖动空间）
  const baseSize = ref({ width: 0, height: 0 });

  const setBaseSize = (width: number, height: number) => {
    baseSize.value = { width, height };
  };

  const MIN_SCALE = 1;
  const MAX_SCALE = 5;
  // 贴边磁吸阈值：拖拽时距离铺边/居中位置在该范围内则自动吸附
  const SNAP_THRESHOLD = 4;

  // ---- pinch-to-zoom 状态 ----
  const pinchStartDist = ref(0);
  const pinchStartScale = ref(1);
  const pinchStartCenter = ref({ x: 0, y: 0 });
  const pinchStartTranslate = ref({ x: 0, y: 0 });

  const getContainerRect = () => {
    return (
      containerRef.value?.getBoundingClientRect() || {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      }
    );
  };

  // 单轴允许的最大偏移：基于图片铺满取景框后的实际尺寸（baseSize * scale）与取景框尺寸之差，
  // 保证图片始终铺满取景框（不露白边），同时当图片大于取景框时留出可拖动空间。
  const getMaxOffset = (
    baseDim: number,
    containerDim: number,
    scale: number,
  ) => {
    return Math.max(0, (baseDim * scale - containerDim) / 2);
  };

  // 磁吸：接近铺边（±maxOffset）或居中（0）位置时自动吸附，形成"贴边感"
  const snap = (value: number, maxOffset: number) => {
    if (maxOffset > 0 && Math.abs(value - maxOffset) <= SNAP_THRESHOLD)
      return maxOffset;
    if (maxOffset > 0 && Math.abs(value + maxOffset) <= SNAP_THRESHOLD)
      return -maxOffset;
    if (Math.abs(value) <= SNAP_THRESHOLD) return 0;
    return value;
  };

  const constrainTranslation = (
    newX: number,
    newY: number,
    scale: number,
    enableSnap = false,
  ) => {
    const container = getContainerRect();
    if (!container.width || !container.height) return { x: newX, y: newY };

    const maxOffsetX = getMaxOffset(
      baseSize.value.width,
      container.width,
      scale,
    );
    const maxOffsetY = getMaxOffset(
      baseSize.value.height,
      container.height,
      scale,
    );

    let x = Math.max(-maxOffsetX, Math.min(maxOffsetX, newX));
    let y = Math.max(-maxOffsetY, Math.min(maxOffsetY, newY));

    if (enableSnap) {
      x = snap(x, maxOffsetX);
      y = snap(y, maxOffsetY);
    }

    return { x, y };
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const container = getContainerRect();
    if (!container.width) return;

    const mouseX = e.clientX - container.left - container.width / 2;
    const mouseY = e.clientY - container.top - container.height / 2;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(
      MIN_SCALE,
      Math.min(MAX_SCALE, transform.value.scale * delta),
    );
    if (newScale === transform.value.scale) return;

    const scaleRatio = newScale / transform.value.scale;
    const newTranslateX =
      mouseX - (mouseX - transform.value.translateX) * scaleRatio;
    const newTranslateY =
      mouseY - (mouseY - transform.value.translateY) * scaleRatio;

    const constrained = constrainTranslation(
      newTranslateX,
      newTranslateY,
      newScale,
    );

    transform.value = {
      scale: newScale,
      translateX: constrained.x,
      translateY: constrained.y,
    };
  };

  // ---- Mouse 事件 ----

  const onMouseDown = (e: MouseEvent) => {
    isDragging.value = true;
    dragStart.value = { x: e.clientX, y: e.clientY };
    transformStart.value = {
      x: transform.value.translateX,
      y: transform.value.translateY,
    };
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging.value) return;
    const dx = e.clientX - dragStart.value.x;
    const dy = e.clientY - dragStart.value.y;

    const constrained = constrainTranslation(
      transformStart.value.x + dx,
      transformStart.value.y + dy,
      transform.value.scale,
      true,
    );

    transform.value = {
      ...transform.value,
      translateX: constrained.x,
      translateY: constrained.y,
    };
  };

  const onMouseUp = () => {
    isDragging.value = false;
  };

  // ---- Touch 事件 ----

  const getTouchDist = (t1: Touch, t2: Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (t1: Touch, t2: Touch) => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  });

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.value = true;
      const t = e.touches[0]!;
      dragStart.value = { x: t.clientX, y: t.clientY };
      transformStart.value = {
        x: transform.value.translateX,
        y: transform.value.translateY,
      };
    } else if (e.touches.length === 2) {
      isDragging.value = false;
      const dist = getTouchDist(e.touches[0]!, e.touches[1]!);
      pinchStartDist.value = dist;
      pinchStartScale.value = transform.value.scale;
      pinchStartCenter.value = getTouchCenter(e.touches[0]!, e.touches[1]!);
      pinchStartTranslate.value = {
        x: transform.value.translateX,
        y: transform.value.translateY,
      };
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging.value) {
      const t = e.touches[0]!;
      const dx = t.clientX - dragStart.value.x;
      const dy = t.clientY - dragStart.value.y;

      const constrained = constrainTranslation(
        transformStart.value.x + dx,
        transformStart.value.y + dy,
        transform.value.scale,
        true,
      );

      transform.value = {
        ...transform.value,
        translateX: constrained.x,
        translateY: constrained.y,
      };
    } else if (e.touches.length === 2 && pinchStartDist.value > 0) {
      const dist = getTouchDist(e.touches[0]!, e.touches[1]!);
      const scaleRatio = dist / pinchStartDist.value;
      const newScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, pinchStartScale.value * scaleRatio),
      );

      const container = getContainerRect();
      const center = getTouchCenter(e.touches[0]!, e.touches[1]!);
      const cx = center.x - container.left - container.width / 2;
      const cy = center.y - container.top - container.height / 2;
      const startCx =
        pinchStartCenter.value.x - container.left - container.width / 2;
      const startCy =
        pinchStartCenter.value.y - container.top - container.height / 2;

      const sr = newScale / pinchStartScale.value;
      const newX =
        startCx - (startCx - pinchStartTranslate.value.x) * sr + (cx - startCx);
      const newY =
        startCy - (startCy - pinchStartTranslate.value.y) * sr + (cy - startCy);

      const constrained = constrainTranslation(newX, newY, newScale);

      transform.value = {
        scale: newScale,
        translateX: constrained.x,
        translateY: constrained.y,
      };
    }
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0) {
      isDragging.value = false;
      pinchStartDist.value = 0;
    } else if (e.touches.length === 1) {
      // 从双指回到单指：重新初始化单指拖拽起点
      pinchStartDist.value = 0;
      isDragging.value = true;
      const t = e.touches[0]!;
      dragStart.value = { x: t.clientX, y: t.clientY };
      transformStart.value = {
        x: transform.value.translateX,
        y: transform.value.translateY,
      };
    }
  };

  const reset = () => {
    transform.value = { scale: 1, translateX: 0, translateY: 0 };
  };

  // 在取景框或图片基准尺寸变化后，重新约束当前位移，避免露出白边
  const reclamp = () => {
    const constrained = constrainTranslation(
      transform.value.translateX,
      transform.value.translateY,
      transform.value.scale,
    );
    transform.value = {
      ...transform.value,
      translateX: constrained.x,
      translateY: constrained.y,
    };
  };

  return {
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
  };
}
