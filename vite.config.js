import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { systemInfoPlugin } from './server/viteSystemInfoPlugin.js'
import { vohiveProxyPlugin } from './server/vohiveProxyPlugin.js'
import { mihomoProxyPlugin } from './server/mihomoProxyPlugin.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Mihomo / VoHive 动态上游均由自定义 Connect 插件处理（Vite 内置 proxy 的 router 无效）

  return {
    plugins: [vue(), systemInfoPlugin(), mihomoProxyPlugin(env), vohiveProxyPlugin(env)],
    server: {
      host: true,
    },
    preview: {
      host: true,
    },
  }
})
