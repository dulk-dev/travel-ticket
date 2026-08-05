<script lang="ts">
import { siGithub, siTiktok, siX, siXiaohongshu } from 'simple-icons'

export interface SocialLink {
  /** 平台名称（用于 aria-label / title） */
  label: string
  /** 个人主页地址；留空表示该平台无值（置灰或隐藏） */
  url?: string
  /** simple-icons 风格的 24x24 SVG path */
  path: string
  /** 有值时的品牌色 */
  color: string
}

// 注意：simple-icons 未收录抖音，抖音与 TikTok 的音符字形一致，
// 这里借用 siTiktok 的 path 作为抖音占位图标。
const DEFAULT_LINKS: SocialLink[] = [
  {
    label: '小红书',
    url: 'https://www.xiaohongshu.com/user/profile/6163ad690000000002026b33',
    path: siXiaohongshu.path,
    color: `#${siXiaohongshu.hex}`,
  },
  {
    label: 'X',
    url: 'https://x.com/hichaochun',
    path: siX.path,
    color: `#${siX.hex}`,
  },
  {
    label: '抖音',
    path: siTiktok.path,
    color: `#${siTiktok.hex}`,
  },
  {
    label: 'GitHub',
    url: 'https://github.com/dulk-dev',
    path: siGithub.path,
    color: `#${siGithub.hex}`,
  },
]
</script>

<script setup lang="ts">
import { computed } from 'vue'

const EMPTY_COLOR = '#9ca3af'

const props = withDefaults(
  defineProps<{
    /** 「Made by」后显示的名字 */
    name?: string
    /** 社媒链接列表 */
    links?: SocialLink[]
    /** 无值（无 url）的平台是否以置灰 icon 占位显示；false 则直接隐藏 */
    showEmpty?: boolean
  }>(),
  {
    name: 'hi超纯',
    links: () => DEFAULT_LINKS,
    showEmpty: true,
  },
)

// 有值的排在前面，无值的始终排在队列尾部（保持各自相对顺序）
const visibleLinks = computed(() => {
  const links = props.showEmpty ? props.links : props.links.filter((link) => link.url)
  return [...links].sort((a, b) => Number(!a.url) - Number(!b.url))
})
</script>

<template>
  <footer class="flex items-center justify-center gap-3 py-6 text-sm select-none">
    <span class="tracking-wide" :style="{ color: EMPTY_COLOR }">
      Made by <span class="font-semibold">{{ name }}</span>
    </span>

    <template v-for="link in visibleLinks" :key="link.label">
      <a
        v-if="link.url"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        :title="link.label"
        :aria-label="link.label"
        class="transition-transform duration-200 hover:scale-110"
      >
        <svg
          viewBox="0 0 24 24"
          class="h-4 w-4"
          :style="{ fill: link.color }"
          aria-hidden="true"
        >
          <path :d="link.path" />
        </svg>
      </a>
      <span
        v-else
        :aria-label="`${link.label}（暂未开通）`"
        class="group relative cursor-default opacity-60"
      >
        <svg
          viewBox="0 0 24 24"
          class="h-4 w-4"
          :style="{ fill: EMPTY_COLOR }"
          aria-hidden="true"
        >
          <path :d="link.path" />
        </svg>
        <!-- 无值平台悬停提示 -->
        <span
          class="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-md px-2 py-1 text-xs whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          :style="{ backgroundColor: '#1f2937', color: '#ffffff' }"
        >
          {{ link.label }} · 暂未开通
          <span
            class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
            :style="{ borderTopColor: '#1f2937' }"
          ></span>
        </span>
      </span>
    </template>
  </footer>
</template>
