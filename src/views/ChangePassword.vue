<script setup>
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import CatLogo from '../components/CatLogo.vue'
import { changePassword } from '../api/auth'
import { getAuthUser, updateAuthUser } from '../stores/auth'
import '../assets/login.css'

const router = useRouter()
const route = useRoute()
const user = getAuthUser()
const isPreview = computed(() => route.meta.preview === true)

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

const rules = computed(() => {
  const next = newPassword.value
  const confirm = confirmPassword.value
  return {
    length: next.length >= 8,
    notDefault: next.toLowerCase() !== 'admin',
    match: confirm.length > 0 && next === confirm,
  }
})

const allRulesMet = computed(() => rules.value.length && rules.value.notDefault && rules.value.match)

async function handleSubmit() {
  if (loading.value) return
  error.value = ''

  if (isPreview.value) {
    error.value = '预览模式仅供查看样式，请通过登录流程进入正式改密页'
    return
  }

  if (!newPassword.value || !confirmPassword.value) {
    error.value = '请填写新密码并确认'
    return
  }

  if (!rules.value.length) {
    error.value = '新密码至少 8 位'
    return
  }

  if (!rules.value.notDefault) {
    error.value = '不能使用默认密码，请设置更安全的密码'
    return
  }

  if (!rules.value.match) {
    error.value = '两次输入的新密码不一致'
    return
  }

  loading.value = true
  try {
    const data = await changePassword({
      newPassword: newPassword.value,
      confirmPassword: confirmPassword.value,
    })
    if (data.user) {
      updateAuthUser(data.user)
    } else {
      updateAuthUser({ mustChangePassword: false })
    }
    await router.push('/dashboard')
  } catch (err) {
    error.value = err?.message || '修改密码失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-bg" aria-hidden="true">
      <span class="auth-wave auth-wave--1" />
      <span class="auth-wave auth-wave--2" />
      <span class="auth-wave auth-wave--3" />
      <span class="auth-wave auth-wave--4" />
    </div>
    <div class="auth-scrim" aria-hidden="true" />

    <div class="auth-stage">
      <form class="auth-card auth-card--wide" @submit.prevent="handleSubmit">
        <span class="auth-deco auth-deco--cube auth-deco--a" aria-hidden="true" />
        <span class="auth-deco auth-deco--cube auth-deco--b" aria-hidden="true" />
        <div class="auth-brand">
          <CatLogo size="lg" />
          <span class="auth-brand-name">OneBoard</span>
        </div>

        <h1 class="auth-title">修改密码</h1>
        <p class="auth-lead">
          欢迎，{{ user?.username || 'admin' }}。首次登录须修改默认密码后才能进入系统。
        </p>

        <label class="auth-field">
          <span class="auth-field-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z"
              />
            </svg>
          </span>
          <input
            id="new-password"
            v-model="newPassword"
            class="auth-input"
            type="password"
            name="newPassword"
            autocomplete="new-password"
            placeholder="新密码"
            :disabled="loading"
          />
        </label>

        <label class="auth-field">
          <span class="auth-field-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z"
              />
            </svg>
          </span>
          <input
            id="confirm-password"
            v-model="confirmPassword"
            class="auth-input"
            type="password"
            name="confirmPassword"
            autocomplete="new-password"
            placeholder="确认新密码"
            :disabled="loading"
            @keyup.enter="handleSubmit"
          />
        </label>

        <ul class="auth-rules" aria-label="密码规则">
          <li :class="{ 'is-ok': rules.length }">
            <span class="auth-rule-dot" aria-hidden="true" />
            至少 8 位字符
          </li>
          <li :class="{ 'is-ok': rules.notDefault }">
            <span class="auth-rule-dot" aria-hidden="true" />
            不可使用默认密码 admin
          </li>
          <li :class="{ 'is-ok': rules.match }">
            <span class="auth-rule-dot" aria-hidden="true" />
            两次输入一致
          </li>
        </ul>

        <p v-if="error" class="auth-alert auth-alert--error" role="alert">{{ error }}</p>

        <div class="auth-actions">
          <button
            class="auth-go"
            type="submit"
            :disabled="loading || !allRulesMet"
            :aria-busy="loading"
          >
            <svg v-if="!loading" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                fill="none"
                stroke="#fff"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M5 12h13m0 0-5-5m5 5-5 5"
              />
            </svg>
            <span v-else class="auth-spinner" aria-hidden="true" />
            <span class="sr-only">{{ loading ? '保存中' : '确认修改' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
