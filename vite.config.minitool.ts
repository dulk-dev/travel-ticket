import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// 小红书小工具专用构建配置
// 与主配置差异：不含 vueDevTools（避免注入开发工具）、输出到独立目录、base 相对路径
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist-minitool',
    // 小工具容器不支持 sourcemap 加载，关闭
    sourcemap: false,
    // 单文件构建无需 modulepreload polyfill（避免注入 fetch 预加载代码）
    modulePreload: {
      polyfill: false,
      resolveDependencies: () => [],
    },
    // 内联 assets 阈值调低，减少请求数（小工具纯本地，内联更稳）
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // 避免生成 .ico 等容器不支持的类型，favicon 由 postbuild 处理
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
})
