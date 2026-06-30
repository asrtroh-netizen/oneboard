import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import Dashboard from '../views/Dashboard.vue'
import { isAuthenticated, mustChangePassword } from '../stores/auth'
import { resetLoading } from '../stores/globalLoading'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/change-password',
    name: 'change-password',
    component: () => import('../views/ChangePassword.vue'),
    meta: { requiresAuth: true, passwordChange: true, title: '修改密码' },
  },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', component: Dashboard, meta: { title: '仪表盘', module: 'monitor' } },
      { path: 'vohive-devices', component: () => import('../views/VoHiveDevices.vue'), meta: { title: 'Vohive设备', module: 'monitor' } },
      { path: 'sms', component: () => import('../views/VoHiveSms.vue'), meta: { title: '短信中心', module: 'monitor' } },
      { path: 'dns', component: () => import('../views/Dns.vue'), meta: { title: 'DNS 监控', module: 'monitor' } },
      { path: 'nodes', component: () => import('../views/Nodes.vue'), meta: { title: 'WIFICALL', module: 'control' } },
      { path: 'rules', component: () => import('../views/Rules.vue'), meta: { title: '规则', module: 'control' } },
      { path: 'subscriptions', component: () => import('../views/Subscriptions.vue'), meta: { title: '订阅', module: 'control' } },
      { path: 'proxy', component: () => import('../views/Proxy.vue'), meta: { title: 'Proxy', module: 'control' } },
      { path: 'settings', component: () => import('../views/Settings.vue'), meta: { title: '设置', module: 'system' } },
      { path: 'logs', component: () => import('../views/Logs.vue'), meta: { title: '日志', module: 'system' } },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const authed = isAuthenticated()
  const needsPasswordChange = mustChangePassword()

  if (to.path === '/login') {
    if (authed && needsPasswordChange) return '/change-password'
    if (authed) return '/dashboard'
    return true
  }

  if (to.path === '/change-password') {
    if (!authed) {
      return { path: '/login', query: { redirect: '/change-password' } }
    }
    if (!needsPasswordChange) return '/dashboard'
    return true
  }

  if (to.matched.some((record) => record.meta.requiresAuth) && !authed) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  if (authed && needsPasswordChange) {
    return '/change-password'
  }

  return true
})

router.afterEach(() => {
  resetLoading()
})

router.onError(() => {
  resetLoading()
})

export default router
