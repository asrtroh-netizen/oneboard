import { createApp } from 'vue'
import './style.css'
import './assets/themes.css'
import './assets/glass-frame-dark.css'
import './assets/polish.css'
import './assets/cinematic-cards.css'
import './assets/semantic-card.css'
import './assets/card-typography.css'
import './assets/card-micro-motion.css'
import './assets/control-sidebar.css'
import './assets/icon-system.css'
import './assets/deep-control-panel.css'
import './assets/cinematic-glass-light.css'
import './assets/realtime-control-plane.css'
import './assets/status-hero-cosmic.css'
import './assets/soft-label-card.css'
import './assets/dashboard-cinematic.css'
import './assets/sidebar-dark.css'
import './assets/vohive-lab.css'
import './assets/vohive-lab-light.css'
import './assets/vohive-chip.css'
import './assets/overview-panels.css'
import './assets/dark-clickables.css'
import './assets/form-select.css'
// 移动端适配层必须最后引入：靠 cascade 顺序覆盖上游同权重规则
import './assets/mobile.css'
import App from './App.vue'
import router from './router'
import { initTheme } from './stores/theme'
import { resetLoading } from './stores/globalLoading'
import { migrateLegacyStorage } from './utils/storageMigration'
import { hydrateClashBackendFromStorage } from './stores/clashBackend'
import { initializeVoHiveActiveBackend } from './stores/vohiveHub'

migrateLegacyStorage()
hydrateClashBackendFromStorage()
void initializeVoHiveActiveBackend()
initTheme()
resetLoading()

createApp(App).use(router).mount('#app')
