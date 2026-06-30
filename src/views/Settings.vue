<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import MIcon from '../components/MIcon.vue'
import { useAppStore } from '../stores/app'
import { themeState, setThemeMode } from '../stores/theme'
import { changePassword } from '../api/auth'
import { getOneBoardVersion } from '../api/oneboard'
import { useMihomoEngine } from '../stores/mihomoEngine'
import { formatVersion, isUpdateAvailable } from '../utils/version'
import { getAuthUser, updateAuthUser } from '../stores/auth'
import {
  clashBackendState,
  clashBackendProfile,
  clashBackendOptions,
  setClashBackendConnection,
  getKernelDisplayName,
  backendSupports,
  resolveClashUpstreamBase,
  isClashBackendConfigured,
} from '../stores/clashBackend'

const { state, formatBytes, showToast } = useAppStore()
const mihomo = useMihomoEngine()
const updateChannel = ref('stable')
const loadingVersions = ref(false)
const upgrading = ref(false)
const applyingBackend = ref(false)

const draftBackendType = ref(clashBackendState.type)
const draftHost = ref(clashBackendState.host)
const draftPort = ref(String(clashBackendState.port))
const draftSecret = ref(clashBackendState.secret)

const oneboardVersion = ref('—')
const oneboardStatus = ref('loading')
const kernelCurrent = ref('—')
const kernelLatest = ref('—')
const kernelLatestError = ref('')
const kernelMeta = ref(false)
const kernelLoadError = ref('')

const kernelProfile = computed(() => clashBackendProfile.value)

const mihomoChannel = computed(() => (updateChannel.value === 'beta' ? 'alpha' : 'release'))

const kernelCanUpgrade = computed(() =>
  backendSupports('upgrade') && isUpdateAvailable(kernelCurrent.value, kernelLatest.value),
)

const kernelLatestLabel = computed(() => {
  if (!backendSupports('latestVersion')) return '平台更新'
  if (loadingVersions.value) return '…'
  if (kernelLatestError.value) return '获取失败'
  return kernelLatest.value
})

const mihomoChannelSub = computed(() => {
  if (!backendSupports('latestVersion')) return kernelProfile.value.subtitle
  return updateChannel.value === 'beta' ? '测试渠道 · Alpha 预发布' : '正式渠道 · Release'
})

const kernelDisplayTitle = computed(() =>
  getKernelDisplayName(kernelMeta.value && kernelProfile.value.id === 'mihomo'),
)

const backendEndpointLabel = computed(() => resolveClashUpstreamBase() || '未配置')

const backendConnectionLabel = computed(() => {
  if (!isClashBackendConfigured()) return '未配置'
  if (loadingVersions.value || applyingBackend.value) return '连接中'
  if (clashBackendState.connected) return '已连接'
  if (clashBackendState.lastError) return '连接失败'
  return '未连接'
})

async function refreshVersions() {
  loadingVersions.value = true
  kernelLoadError.value = ''
  kernelLatestError.value = ''
  try {
    const tasks = [getOneBoardVersion()]

    if (isClashBackendConfigured()) {
      tasks.push(
        mihomo.fetchKernelVersion().catch((err) => {
          kernelLoadError.value = err?.message || '内核版本加载失败'
          return null
        }),
      )

      if (backendSupports('latestVersion')) {
        tasks.push(mihomo.fetchLatestKernelVersion(mihomoChannel.value))
      }
    }

    const results = await Promise.all(tasks)
    const oneboard = results[0]
    const kernel = isClashBackendConfigured() ? results[1] : null
    const latest = isClashBackendConfigured() && backendSupports('latestVersion') ? results[2] : null

    oneboardVersion.value = formatVersion(oneboard?.version)
    oneboardStatus.value = oneboard?.status || 'running'

    if (kernel) {
      kernelCurrent.value = formatVersion(kernel?.version)
      kernelMeta.value = Boolean(kernel?.meta)
    } else {
      kernelCurrent.value = '—'
      kernelMeta.value = false
    }

    if (backendSupports('latestVersion') && isClashBackendConfigured()) {
      if (latest) {
        kernelLatest.value = formatVersion(latest)
      } else {
        kernelLatest.value = '—'
        kernelLatestError.value = '无法连接 GitHub 获取最新版本'
      }
    } else {
      kernelLatest.value = '—'
    }
  } catch (err) {
    kernelLoadError.value = err?.message || '版本信息加载失败'
    showToast(kernelLoadError.value, 'error')
  } finally {
    loadingVersions.value = false
  }
}

async function handleUpgradeKernel() {
  if (upgrading.value || !backendSupports('upgrade')) return
  upgrading.value = true
  try {
    await mihomo.upgradeKernel(mihomoChannel.value)
    showToast(`${kernelDisplayTitle.value} 升级成功`, 'success')
    await refreshVersions()
  } catch (err) {
    const msg = String(err?.message || '升级失败')
    if (/already using latest/i.test(msg)) {
      showToast('已是最新版本', 'info')
      await refreshVersions()
    } else {
      showToast(msg, 'error')
    }
  } finally {
    upgrading.value = false
  }
}

async function handleUpdateOneBoard() {
  if (loadingVersions.value) return
  await refreshVersions()
  showToast('OneBoard 版本信息已刷新', 'success')
}

async function handleUpdateKernel() {
  if (upgrading.value || loadingVersions.value) return
  if (kernelCanUpgrade.value) {
    await handleUpgradeKernel()
    return
  }
  await refreshVersions()
  if (backendSupports('upgrade')) {
    showToast(`${kernelDisplayTitle.value} 已是最新版本`, 'info')
  } else {
    showToast('当前后端请在对应平台手动更新', 'info')
  }
}

async function applyBackendSettings() {
  applyingBackend.value = true
  try {
    setClashBackendConnection({
      type: draftBackendType.value,
      host: draftHost.value,
      port: draftPort.value,
      secret: draftSecret.value,
    })
    mihomo.reconnect(state, formatBytes)
    await refreshVersions()
    if (!clashBackendState.connected) {
      showToast(
        clashBackendState.lastError || kernelLoadError.value || '无法连接 Clash 后端，请检查主机、端口与 Secret',
        'error',
      )
      return
    }
    showToast(`已切换至 ${kernelProfile.value.label} 并重新连接`, 'success')
  } catch (err) {
    showToast(err?.message || '后端连接失败', 'error')
  } finally {
    applyingBackend.value = false
  }
}

const oneboardStatusLabel = computed(() => {
  if (loadingVersions.value) return '检查中'
  if (oneboardStatus.value === 'running') return '运行中'
  return oneboardStatus.value || '—'
})

const kernelStatusLabel = computed(() => {
  if (!isClashBackendConfigured()) return '未配置'
  if (loadingVersions.value) return '检查中'
  if (!clashBackendState.connected && kernelLoadError.value) return '离线'
  if (kernelCanUpgrade.value) return '可更新'
  return clashBackendState.connected ? '最新' : '检查中'
})

const kernelUpdateButtonLabel = computed(() => {
  if (upgrading.value) return '更新中…'
  if (!backendSupports('upgrade')) return '手动更新'
  if (kernelCanUpgrade.value) return '更新'
  return '检查更新'
})

watch(updateChannel, () => {
  if (backendSupports('latestVersion')) refreshVersions()
})

function syncDraftsFromBackend() {
  draftBackendType.value = clashBackendState.type
  draftHost.value = clashBackendState.host
  draftPort.value = String(clashBackendState.port)
  draftSecret.value = clashBackendState.secret
}

onMounted(() => {
  syncDraftsFromBackend()
  refreshVersions()
})

const newPassword = ref('')
const confirmPassword = ref('')
const currentPassword = ref('')
const changingPassword = ref(false)
const licenseKey = ref('')
const authUser = ref(getAuthUser())

const requiresCurrentPassword = computed(() => !authUser.value?.mustChangePassword)

function handleExport() { showToast('配置导出成功', 'success') }
function handleActivate() { showToast('授权激活成功', 'success') }
function handleScan() { showToast('开始扫描系统垃圾...', 'info') }

async function handleChangePassword() {
  if (changingPassword.value) return

  const nextPassword = String(newPassword.value || '')
  const confirm = String(confirmPassword.value || '')
  const current = String(currentPassword.value || '')

  if (requiresCurrentPassword.value && !current) {
    showToast('请填写当前密码', 'warning')
    return
  }
  if (!nextPassword || !confirm) {
    showToast('请填写新密码并确认', 'warning')
    return
  }
  if (nextPassword.length < 8) {
    showToast('新密码至少 8 位', 'warning')
    return
  }
  if (nextPassword !== confirm) {
    showToast('两次输入的新密码不一致', 'warning')
    return
  }

  changingPassword.value = true
  try {
    const data = await changePassword({
      currentPassword: requiresCurrentPassword.value ? current : '',
      newPassword: nextPassword,
      confirmPassword: confirm,
    })
    if (data?.user) {
      updateAuthUser(data.user)
      authUser.value = data.user
    } else {
      updateAuthUser({ mustChangePassword: false })
      authUser.value = { ...(authUser.value || {}), mustChangePassword: false }
    }
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    showToast('密码修改成功', 'success')
  } catch (err) {
    showToast(err?.message || '修改密码失败，请稍后重试', 'error')
  } finally {
    changingPassword.value = false
  }
}
</script>

<template>
  <div class="settings-page">
    <h1 class="page-title">设置</h1>

    <!-- 版本升级 -->
    <div class="section-block">
      <div class="section-header">
        <div class="section-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"/></svg>
        </div>
        <div>
          <div class="section-title">版本升级</div>
          <div class="section-desc">检查并更新系统组件到最新版本</div>
        </div>
      </div>
      <div class="panel-card panel-neutral version-channel-card">
        <div class="version-channel-row">
          <span class="info-label">更新渠道</span>
          <div class="channel-toggle">
            <button type="button" :class="{ active: updateChannel === 'stable' }" @click="updateChannel = 'stable'">
              正式版
            </button>
            <button type="button" :class="{ active: updateChannel === 'beta' }" @click="updateChannel = 'beta'">
              测试版
            </button>
          </div>
          <button
            type="button"
            class="ob-action-btn version-channel-refresh"
            title="检查更新"
            :disabled="loadingVersions"
            @click="refreshVersions"
          >
            <MIcon name="refresh" size="sm" />
          </button>
        </div>
      </div>

      <div class="info-row version-info-row">
        <div class="panel-card panel-blue version-card">
          <div class="version-card__head panel-head panel-head-between">
            <div class="panel-head-left">
              <div class="panel-icon"><MIcon name="view_module" /></div>
              <div>
                <div class="panel-title">OneBoard</div>
                <div class="panel-sub">控制面板 · 本地服务</div>
              </div>
            </div>
            <span class="status-pill" :class="{ offline: oneboardStatus !== 'running' && !loadingVersions }">
              <span class="dot" />{{ oneboardStatusLabel }}
            </span>
          </div>
          <div class="version-card__body"></div>
          <div class="version-card__footer">
            <div class="ob-info-stack version-card__meta">
              <div
                class="ob-info-badge"
                :class="oneboardStatus === 'running' ? 'ob-info-badge--ready' : 'ob-info-badge--warn'"
              >
                <span class="ob-info-badge__dot"></span>
                <span class="ob-info-badge__text">
                  当前版本 {{ loadingVersions ? '…' : oneboardVersion }}
                  · 状态 {{ oneboardStatus === 'running' ? '正常' : oneboardStatus }}
                </span>
              </div>
            </div>
            <button
              type="button"
              class="panel-btn"
              :disabled="loadingVersions"
              @click="handleUpdateOneBoard"
            >
              <MIcon name="system_update_alt" size="sm" />
              {{ loadingVersions ? '检查中…' : '更新' }}
            </button>
          </div>
        </div>

        <div class="panel-card version-card" :class="kernelProfile.panelClass">
          <div class="version-card__head panel-head panel-head-between">
            <div class="panel-head-left">
              <div class="panel-icon"><MIcon :name="kernelProfile.icon" /></div>
              <div>
                <div class="panel-title">{{ kernelDisplayTitle }}</div>
                <div class="panel-sub">{{ mihomoChannelSub }}</div>
              </div>
            </div>
            <span
              class="status-pill"
              :class="{
                'status-pill--warn': kernelCanUpgrade,
                offline: !clashBackendState.connected && !loadingVersions,
              }"
            >
              <span class="dot" />{{ kernelStatusLabel }}
            </span>
          </div>
          <div class="version-card__body"></div>
          <div class="version-card__footer">
            <div class="ob-info-stack version-card__meta">
              <div
                class="ob-info-badge"
                :class="kernelLatestError || kernelLoadError
                  ? 'ob-info-badge--warn'
                  : (kernelCanUpgrade ? 'ob-info-badge--warn' : 'ob-info-badge--ready')"
              >
                <span class="ob-info-badge__dot"></span>
                <span class="ob-info-badge__text">
                  当前版本 {{ loadingVersions ? '…' : kernelCurrent }}
                  · 最新 {{ kernelLatestLabel }}
                </span>
              </div>
            </div>
            <button
              type="button"
              class="panel-btn"
              :disabled="upgrading || loadingVersions"
              @click="handleUpdateKernel"
            >
              <MIcon name="system_update_alt" size="sm" />
              {{ kernelUpdateButtonLabel }}
            </button>
          </div>
        </div>

        <div class="panel-card panel-purple backend-card version-card">
          <div class="version-card__head panel-head panel-head-between">
            <div class="panel-head-left">
              <div class="panel-icon"><MIcon name="tune" /></div>
              <div>
                <div class="panel-title">Clash 后端</div>
                <div class="panel-sub">手动选择 API 客户端</div>
              </div>
            </div>
            <span
              class="status-pill"
              :class="{ offline: !clashBackendState.connected && !loadingVersions && !applyingBackend }"
            >
              <span class="dot" />{{ backendConnectionLabel }}
            </span>
          </div>

          <div class="version-card__body">
            <div class="backend-picker">
            <button
              v-for="item in clashBackendOptions"
              :key="item.id"
              type="button"
              class="backend-picker__btn"
              :class="{ active: draftBackendType === item.id }"
              @click="draftBackendType = item.id"
            >
              {{ item.label }}
            </button>
          </div>

          <div class="backend-fields">
            <label class="backend-field">
              <span>主机</span>
              <input v-model="draftHost" type="text" placeholder="填写 Mihomo API 主机" />
            </label>
            <label class="backend-field backend-field--short">
              <span>端口</span>
              <input v-model="draftPort" type="number" min="1" max="65535" placeholder="9090" />
            </label>
            <label class="backend-field">
              <span>Secret</span>
              <input v-model="draftSecret" type="password" placeholder="Bearer Token（可选）" />
            </label>
          </div>
          </div>

          <div class="version-card__footer">
            <div class="ob-info-stack version-card__meta">
              <div class="ob-info-badge ob-info-badge--ready">
                <span class="ob-info-badge__dot"></span>
                <span class="ob-info-badge__text">
                  当前 {{ kernelProfile.label }} · {{ backendEndpointLabel }}
                </span>
              </div>
            </div>

            <button
              type="button"
              class="panel-btn"
              :disabled="applyingBackend || loadingVersions"
              @click="applyBackendSettings"
            >
              <MIcon name="link" size="sm" />
              {{ applyingBackend ? '连接中…' : '保存并连接' }}
            </button>
          </div>
        </div>
      </div>

      <p v-if="kernelLoadError || kernelLatestError" class="version-error">
        {{ kernelLoadError || kernelLatestError }}
      </p>
    </div>

    <!-- 外观设置 -->
    <div class="section-block">
      <div class="section-header">
        <div class="section-icon purple">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/></svg>
        </div>
        <div>
          <div class="section-title">外观设置</div>
          <div class="section-desc">自定义界面主题和登录页背景</div>
        </div>
      </div>
      <div class="settings-row">
        <div class="card">
          <div class="card-title">主题</div>
          <div class="theme-options">
            <button class="theme-opt" :class="{ active: themeState.mode === 'light' }" @click="setThemeMode('light')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/></svg>
              浅色
            </button>
            <button class="theme-opt" :class="{ active: themeState.mode === 'dark' }" @click="setThemeMode('dark')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              深色
            </button>
            <button class="theme-opt" :class="{ active: themeState.mode === 'auto' }" @click="setThemeMode('auto')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              自动
            </button>
          </div>
        </div>
        <div class="card">
          <div class="card-title">登录页背景图片</div>
          <div class="upload-area">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            <span>选择图片</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 账户安全 -->
    <div class="section-block">
      <div class="section-header">
        <div class="section-icon orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div>
          <div class="section-title">账户安全</div>
          <div class="section-desc">管理账户密码和授权信息</div>
        </div>
      </div>
      <div class="settings-row">
        <div class="card">
          <div class="card-title">修改密码</div>
          <form @submit.prevent="handleChangePassword">
            <div v-if="requiresCurrentPassword" class="form-group">
              <label>当前密码</label>
              <input
                v-model="currentPassword"
                type="password"
                autocomplete="current-password"
                placeholder="请输入当前密码"
                :disabled="changingPassword"
              />
            </div>
            <div class="form-group">
              <label>新密码</label>
              <input
                v-model="newPassword"
                type="password"
                autocomplete="new-password"
                placeholder="至少 8 位"
                :disabled="changingPassword"
              />
            </div>
            <div class="form-group">
              <label>确认密码</label>
              <input
                v-model="confirmPassword"
                type="password"
                autocomplete="new-password"
                placeholder="请再次输入新密码"
                :disabled="changingPassword"
              />
            </div>
            <button class="btn btn-primary" type="submit" :disabled="changingPassword">
              {{ changingPassword ? '提交中…' : '提交修改' }}
            </button>
          </form>
        </div>
        <div class="card">
          <div class="card-title">授权管理</div>
          <div class="license-info">
            <div class="license-row"><span>设备 ID</span><span class="mono">OB-2026-A1B2C3</span></div>
            <div class="license-row"><span>授权状态</span><span class="tag tag-red">未授权</span></div>
          </div>
          <div class="form-group"><label>授权密钥</label><input v-model="licenseKey" type="text" placeholder="输入授权密钥" /></div>
          <button class="btn btn-primary" @click="handleActivate">激活</button>
        </div>
      </div>
    </div>

    <!-- 数据管理 -->
    <div class="section-block">
      <div class="section-header">
        <div class="section-icon green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
        </div>
        <div>
          <div class="section-title">数据管理</div>
          <div class="section-desc">导出和导入系统配置数据</div>
        </div>
      </div>
      <div class="card">
        <div class="data-row">
          <div class="data-col">
            <div class="data-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></div>
            <div class="data-title">导出数据</div>
            <div class="data-desc">将配置数据导出为备份文件</div>
            <button class="btn btn-primary" @click="handleExport">导出数据</button>
          </div>
          <div class="data-col">
            <div class="data-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg></div>
            <div class="data-title">导入数据</div>
            <div class="data-desc">从备份文件恢复配置数据</div>
            <button class="btn btn-ghost">选择备份文件 (.zip)</button>
          </div>
        </div>
        <div class="warning-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          注意：导入数据将覆盖当前系统中的相应数据，请谨慎操作。
        </div>
      </div>
    </div>

    <!-- 系统垃圾清理 -->
    <div class="section-block">
      <div class="section-header">
        <div class="section-icon pink">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
        </div>
        <div>
          <div class="section-title">系统垃圾清理</div>
          <div class="section-desc">检测并清理系统垃圾日志和缓存文件</div>
        </div>
      </div>
      <div class="card cleanup-card">
        <div class="cleanup-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg></div>
        <div class="cleanup-title">扫描系统中的垃圾日志和缓存文件</div>
        <div class="cleanup-desc">支持 Debian、Ubuntu、Alpine 等 Linux 发行版</div>
        <button class="btn btn-primary" @click="handleScan">开始扫描</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-block { margin-bottom: 24px; }

.version-channel-card {
  margin-bottom: var(--space-grid, 12px);
  padding: 14px 18px;
}

.version-channel-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.channel-toggle {
  display: flex;
  background: var(--bg-input);
  border-radius: 999px;
  padding: 2px;
  border: 1px solid var(--border-subtle);
}

.channel-toggle button {
  padding: 6px 14px;
  font-size: var(--fs-sm);
  color: var(--text-muted);
  border-radius: 999px;
  transition: background 0.15s ease, color 0.15s ease;
}

.channel-toggle button.active {
  background: var(--accent);
  color: #fff;
}

.version-channel-refresh {
  margin-left: auto;
  min-width: 36px;
  min-height: 36px;
  padding: 0 10px;
}

.version-info-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-grid, 12px);
  align-items: stretch;
}

.version-info-row .version-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 380px;
}

.version-info-row .version-card__head {
  flex: none;
  min-height: 56px;
}

.version-info-row .version-card__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.version-info-row .version-card__footer {
  flex: none;
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding-top: 10px;
}

.version-info-row .version-card__meta {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-bottom: 0;
}

.version-info-row .version-card__meta.ob-info-stack {
  align-items: center;
}

.version-info-row .version-card__footer > .panel-btn {
  margin-top: 0;
}

.backend-picker {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 10px;
}

.backend-picker__btn {
  padding: 7px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.backend-picker__btn.active {
  color: #fff;
  background: var(--accent);
  border-color: rgba(79, 140, 255, 0.35);
}

.backend-fields {
  display: grid;
  grid-template-columns: 1fr 92px;
  gap: 8px;
  margin-bottom: 10px;
}

.backend-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.backend-field--short {
  grid-column: 2;
  grid-row: 1;
}

.backend-field:nth-child(3) {
  grid-column: 1 / -1;
}

.backend-field span {
  font-size: 11px;
  color: var(--text-muted);
}

.backend-field input {
  width: 100%;
  padding: 7px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-field);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
}

.backend-card .ob-info-stack {
  margin-bottom: 0;
}

.version-info-row .ob-info-stack {
  margin-bottom: 0;
}

.version-error {
  margin: 12px 0 0;
  font-size: var(--fs-sm);
  color: var(--danger, #f87171);
}

.status-pill--warn {
  color: var(--warning, #fbbf24);
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 191, 36, 0.2);
}

.status-pill--warn .dot {
  background: var(--warning, #fbbf24);
}

.panel-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.settings-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.theme-options { display: flex; gap: 10px; }
.theme-opt {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: var(--fs-base);
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

:global(html[data-theme='dark']) .theme-opt {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-glass);
}

:global(html[data-theme='dark']) .theme-opt.active {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}

.theme-opt svg { width: 24px; height: 24px; }

.upload-area { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px; border: 2px dashed var(--border-field); border-radius: var(--radius-md); color: var(--text-muted); font-size: var(--fs-base); cursor: pointer; }
.upload-area svg { width: 32px; height: 32px; opacity: 0.4; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: var(--fs-sm); color: var(--text-muted); margin-bottom: 6px; }
.form-group input { width: 100%; padding: 8px 12px; background: var(--bg-input); border: 1px solid var(--border-field); border-radius: var(--radius-sm); color: var(--text-primary); font-size: var(--fs-base); outline: none; }
.license-info { margin-bottom: 12px; }
.license-row { display: flex; justify-content: space-between; font-size: var(--fs-base); margin-bottom: 8px; }
.mono { font-family: var(--mono); font-size: var(--fs-sm); }
.data-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px; }
.data-col { text-align: center; padding: 20px; }
.data-icon { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
.data-icon svg { width: 22px; height: 22px; }
.data-icon.blue { background: var(--accent-soft); color: var(--accent); }
.data-icon.purple { background: var(--purple-soft); color: var(--purple); }
.data-title { font-size: var(--fs-lg); font-weight: 600; margin-bottom: 6px; color: var(--text-primary); }
.data-desc { font-size: var(--fs-sm); color: var(--text-muted); margin-bottom: 14px; }
.warning-box { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: rgba(250, 173, 20, 0.08); border: 1px solid rgba(250, 173, 20, 0.2); border-radius: var(--radius-sm); font-size: var(--fs-sm); color: var(--warning); }
.warning-box svg { width: 16px; height: 16px; flex-shrink: 0; }
.cleanup-card { text-align: center; padding: 40px 20px; }
.cleanup-icon { width: 64px; height: 64px; border-radius: 50%; background: var(--pink-soft); color: var(--pink); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.cleanup-icon svg { width: 28px; height: 28px; }
.cleanup-title { font-size: var(--fs-lg); font-weight: 600; margin-bottom: 6px; color: var(--text-primary); }
.cleanup-desc { font-size: var(--fs-sm); color: var(--text-muted); margin-bottom: 20px; }
@media (max-width: 1400px) {
  .version-info-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .version-info-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .version-info-row,
  .settings-row,
  .data-row {
    grid-template-columns: 1fr;
  }
}
</style>
