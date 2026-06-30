<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import CatLogo from '../components/CatLogo.vue'
import { login as loginApi } from '../api/auth'
import { setAuthSession } from '../stores/auth'
import '../assets/login.css'

const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  if (loading.value) return
  error.value = ''

  const user = username.value.trim()
  if (!user || !password.value) {
    error.value = '请输入账号和密码'
    return
  }

  loading.value = true
  try {
    const data = await loginApi(user, password.value)
    setAuthSession(data.token, data.user)
    if (data.user?.mustChangePassword) {
      await router.push('/change-password')
      return
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await router.push(redirect)
  } catch (err) {
    error.value = err?.message || '登录失败，请稍后重试'
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
      <form class="auth-card" @submit.prevent="handleSubmit">
        <span class="auth-deco auth-deco--cube auth-deco--a" aria-hidden="true" />
        <span class="auth-deco auth-deco--cube auth-deco--b" aria-hidden="true" />
        <div class="auth-brand">
          <CatLogo size="lg" />
          <span class="auth-brand-name">OneBoard</span>
        </div>

        <h1 class="auth-title">登录</h1>
        <p class="auth-lead">请输入账号与密码进入控制台</p>

        <label class="auth-field">
          <span class="auth-field-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                d="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
              />
            </svg>
          </span>
          <input
            v-model="username"
            class="auth-input"
            type="text"
            name="username"
            autocomplete="username"
            placeholder="用户名"
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
            v-model="password"
            class="auth-input"
            type="password"
            name="password"
            autocomplete="current-password"
            placeholder="密码"
            :disabled="loading"
            @keyup.enter="handleSubmit"
          />
        </label>

        <p v-if="error" class="auth-alert auth-alert--error" role="alert">{{ error }}</p>

        <div class="auth-actions">
          <button class="auth-go" type="submit" :disabled="loading" :aria-busy="loading">
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
            <span class="sr-only">{{ loading ? '登录中' : '登录' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
