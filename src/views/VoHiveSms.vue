<script setup>
import { onMounted } from 'vue'
import MIcon from '../components/MIcon.vue'
import { useVoHiveSms } from '../composables/useVoHiveSms'
import { useAppStore } from '../stores/app'

const { showToast } = useAppStore()

const {
  configured,
  devices,
  filteredContacts,
  messageGroups,
  selectedDeviceId,
  selectedContactKey,
  selectedContact,
  search,
  draft,
  loading,
  threadLoading,
  historyLoading,
  sending,
  hasMoreHistory,
  error,
  threadRef,
  selectDevice,
  selectContact,
  refreshAll,
  sendReply,
  onThreadScroll,
} = useVoHiveSms()

async function onRefresh() {
  await refreshAll()
  if (error.value) showToast(error.value, 'error')
}

async function onSend() {
  const ok = await sendReply()
  if (ok) showToast('短信已发送', 'success')
  else if (error.value) showToast(error.value, 'error')
}

function onDraftKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    void onSend()
  }
}

onMounted(() => {
  if (!configured.value) showToast('请先在设置中登录 VoHive', 'warning')
})
</script>

<template>
  <div class="vohive-lab-shell vohive-console sms-page">
    <header class="sms-page__head">
      <div>
        <h1 class="page-title">短信中心</h1>
        <p class="sms-page__sub">支持加载历史会话，向上滚动可查看更早短信</p>
      </div>
      <div class="sms-page__actions">
        <button type="button" class="runtime-action-btn glass-frame glass-frame--compact" :disabled="loading" @click="onRefresh">
          <MIcon name="refresh" size="sm" />
          {{ loading ? '刷新中…' : '刷新' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="sms-page__error">{{ error }}</p>

    <div class="sms-layout glass-frame">
      <aside class="sms-panel sms-panel--devices">
        <div class="sms-panel__title">设备</div>
        <button
          type="button"
          class="sms-device"
          :class="{ active: selectedDeviceId === 'all' }"
          @click="selectDevice('all')"
        >
          <span class="sms-device__dot online"></span>
          <span>全部设备</span>
        </button>
        <button
          v-for="device in devices"
          :key="device.id"
          type="button"
          class="sms-device"
          :class="{ active: selectedDeviceId === device.id }"
          @click="selectDevice(device.id)"
        >
          <span class="sms-device__dot" :class="{ online: device.online }"></span>
          <span class="sms-device__name">{{ device.name || device.id }}</span>
          <span v-if="device.code" class="sms-device__code">{{ device.code }}</span>
        </button>
      </aside>

      <aside class="sms-panel sms-panel--contacts">
        <input v-model="search" class="sms-search" type="search" placeholder="搜索联系人/内容" />
        <div v-if="loading && !filteredContacts.length" class="sms-panel__empty">加载中…</div>
        <div v-else-if="!filteredContacts.length" class="sms-panel__empty">暂无联系人</div>
        <button
          v-for="contact in filteredContacts"
          :key="contact.key"
          type="button"
          class="sms-contact"
          :class="{ active: selectedContactKey === contact.key }"
          @click="selectContact(contact.key)"
        >
          <div class="sms-contact__row">
            <span class="sms-contact__peer">{{ contact.peer }}</span>
            <span class="sms-contact__time">{{ contact.lastTimeLabel }}</span>
          </div>
          <div class="sms-contact__preview">{{ contact.lastMessage || '（无内容）' }}</div>
          <div v-if="contact.deviceName || contact.localPhone" class="sms-contact__meta">
            <span v-if="contact.deviceName">{{ contact.deviceName }}</span>
            <span v-if="contact.localPhone">{{ contact.localPhone }}</span>
          </div>
        </button>
      </aside>

      <section class="sms-panel sms-panel--thread">
        <div v-if="!selectedContact" class="sms-panel__empty">请选择联系人</div>
        <template v-else>
          <header class="sms-head">
            <div>
              <div class="sms-head__peer">{{ selectedContact.peer }}</div>
              <div class="sms-sub">
                设备：{{ selectedContact.deviceName || selectedContact.deviceId || '—' }}
                <span v-if="selectedContact.localPhone"> · {{ selectedContact.localPhone }}</span>
              </div>
            </div>
            <button type="button" class="runtime-action-btn glass-frame glass-frame--compact" @click="refreshAll({ silent: false })">
              最新
            </button>
          </header>

          <div
            ref="threadRef"
            class="sms-thread"
            @scroll="onThreadScroll"
          >
            <div v-if="historyLoading" class="sms-thread__hint">正在加载历史短信…</div>
            <div v-else-if="hasMoreHistory" class="sms-thread__hint">向上滚动加载更早短信</div>

            <div v-if="threadLoading && !messageGroups.length" class="sms-panel__empty">加载会话中…</div>
            <div v-else-if="!messageGroups.length" class="sms-panel__empty">暂无短信记录</div>

            <div v-for="group in messageGroups" :key="group.date" class="sms-day">
              <div class="sms-day__label">{{ group.date }}</div>
              <article v-for="message in group.items" :key="message.id" class="sms-msg">
                <div class="sms-msg__meta">
                  <span class="sms-msg__sender">{{ message.peer || message.sender }}</span>
                  <span class="sms-msg__time">{{ message.timeLabel }}</span>
                </div>
                <div class="sms-msg__bubble">{{ message.body }}</div>
                <div v-if="message.deviceName" class="sms-latest">设备：{{ message.deviceName }}</div>
              </article>
            </div>
          </div>

          <footer class="sms-compose">
            <textarea
              v-model="draft"
              class="sms-compose__input"
              rows="2"
              placeholder="回复（Enter 发送）"
              @keydown="onDraftKeydown"
            />
            <button type="button" class="sms-compose__send" :disabled="sending || !draft.trim()" @click="onSend">
              {{ sending ? '发送中…' : '发送' }}
            </button>
          </footer>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.sms-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: calc(100vh - 120px);
}

.sms-page__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.sms-page__sub {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.sms-page__actions {
  display: flex;
  gap: 8px;
}

.sms-page__error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(242, 139, 130, 0.12);
  color: #f28b82;
  font-size: 13px;
}

.sms-layout {
  display: grid;
  grid-template-columns: 180px 280px minmax(0, 1fr);
  min-height: 640px;
  overflow: hidden;
}

.sms-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.sms-panel:last-child {
  border-right: none;
}

.sms-panel__title {
  padding: 14px 14px 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.sms-panel__empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.sms-panel--devices,
.sms-panel--contacts {
  overflow-y: auto;
}

.sms-device,
.sms-contact {
  width: 100%;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.sms-device {
  display: grid;
  grid-template-columns: 10px 1fr;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
}

.sms-device.active,
.sms-contact.active {
  background: rgba(56, 120, 200, 0.12);
}

.sms-device__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.5);
}

.sms-device__dot.online {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.45);
}

.sms-device__name {
  font-size: 13px;
  font-weight: 600;
}

.sms-device__code {
  grid-column: 2;
  font-size: 11px;
  color: var(--text-muted);
}

.sms-search {
  margin: 0 12px 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  font: inherit;
}

.sms-contact {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.sms-contact__row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.sms-contact__peer {
  font-size: 13px;
  font-weight: 600;
}

.sms-contact__time {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono, monospace);
}

.sms-contact__preview,
.sms-contact__meta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sms-panel--thread {
  min-width: 0;
}

.sms-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.sms-head__peer {
  font-size: 15px;
  font-weight: 700;
}

.sms-sub,
.sms-latest,
.sms-msg__time {
  font-size: 12px;
  color: var(--text-muted);
}

.sms-thread {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.sms-thread__hint {
  margin-bottom: 12px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
}

.sms-day + .sms-day {
  margin-top: 18px;
}

.sms-day__label {
  width: fit-content;
  margin: 0 auto 12px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-muted);
}

.sms-msg + .sms-msg {
  margin-top: 12px;
}

.sms-msg__meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.sms-msg__sender {
  font-size: 12px;
  font-weight: 600;
}

.sms-msg__bubble {
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.sms-compose {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.sms-compose__input {
  resize: vertical;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  font: inherit;
}

.sms-compose__send {
  align-self: end;
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  background: #3b82f6;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.sms-compose__send:disabled {
  opacity: 0.55;
  cursor: wait;
}

@media (max-width: 1100px) {
  .sms-layout {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .sms-panel {
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    max-height: 240px;
  }

  .sms-panel--thread {
    max-height: none;
    min-height: 520px;
  }
}
</style>
