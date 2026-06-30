import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDevices, getSmsContacts, getSmsThread, sendSms } from '../api/vohive.adapter'
import { isVoHiveAuthenticated } from '../stores/vohiveAuth'
import {
  groupSmsByDate,
  normalizeDeviceList,
  normalizeSmsContacts,
  normalizeSmsList,
  sortSmsMessagesAsc,
} from '../utils/vohiveDevice'

const THREAD_LIMIT = 80

function buildThreadParams(contact, deviceId, { beforeTs, beforeId } = {}) {
  const params = {
    peer: contact.peer,
    limit: THREAD_LIMIT,
  }
  if (contact.imsi) params.imsi = contact.imsi
  params.deviceId = deviceId && deviceId !== 'all' ? deviceId : 'all'
  if (beforeTs) params.beforeTs = beforeTs
  if (beforeId != null && beforeId !== '') params.beforeId = beforeId
  return params
}

export function useVoHiveSms() {
  const route = useRoute()
  const router = useRouter()

  const devices = ref([])
  const contacts = ref([])
  const messages = ref([])
  const selectedDeviceId = ref(typeof route.query.device === 'string' ? route.query.device : 'all')
  const selectedContactKey = ref(typeof route.query.contact === 'string' ? route.query.contact : '')
  const search = ref('')
  const draft = ref('')
  const loading = ref(false)
  const threadLoading = ref(false)
  const historyLoading = ref(false)
  const sending = ref(false)
  const hasMoreHistory = ref(false)
  const error = ref('')
  const threadRef = ref(null)

  const configured = computed(() => isVoHiveAuthenticated())

  const selectedContact = computed(
    () => contacts.value.find((item) => item.key === selectedContactKey.value) || null,
  )

  const filteredContacts = computed(() => {
    const q = search.value.trim().toLowerCase()
    if (!q) return contacts.value
    return contacts.value.filter((item) =>
      [item.peer, item.lastMessage, item.deviceName, item.localPhone, item.imsi]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  })

  const messageGroups = computed(() => groupSmsByDate(messages.value))

  function syncRoute() {
    const query = {}
    if (selectedDeviceId.value && selectedDeviceId.value !== 'all') {
      query.device = selectedDeviceId.value
    }
    if (selectedContactKey.value) query.contact = selectedContactKey.value
    router.replace({ query })
  }

  async function loadDevices() {
    const payload = await getDevices()
    devices.value = normalizeDeviceList(payload)
  }

  async function loadContacts({ silent = false } = {}) {
    if (!configured.value) return
    if (!silent) loading.value = true
    error.value = ''
    try {
      const payload = await getSmsContacts({
        deviceId: selectedDeviceId.value,
        limit: 200,
      })
      contacts.value = normalizeSmsContacts(payload)
    } catch (err) {
      error.value = err?.message || '短信联系人加载失败'
      contacts.value = []
    } finally {
      if (!silent) loading.value = false
    }
  }

  async function loadThread({ silent = false, scrollToBottom = true } = {}) {
    const contact = selectedContact.value
    if (!contact) {
      messages.value = []
      hasMoreHistory.value = false
      return false
    }

    if (!silent) threadLoading.value = true
    error.value = ''
    try {
      const payload = await getSmsThread(buildThreadParams(contact, selectedDeviceId.value))
      const list = sortSmsMessagesAsc(normalizeSmsList(payload))
      messages.value = list
      hasMoreHistory.value = list.length >= THREAD_LIMIT
      if (scrollToBottom) await scrollThreadToBottom()
      return true
    } catch (err) {
      error.value = err?.message || '短信会话加载失败'
      messages.value = []
      hasMoreHistory.value = false
      return false
    } finally {
      if (!silent) threadLoading.value = false
    }
  }

  async function loadOlderMessages() {
    const contact = selectedContact.value
    const oldest = messages.value[0]
    if (!contact || !oldest || historyLoading.value || !hasMoreHistory.value) return

    const container = threadRef.value
    const prevTop = container?.scrollTop || 0
    const prevHeight = container?.scrollHeight || 0

    historyLoading.value = true
    try {
      const payload = await getSmsThread(buildThreadParams(contact, selectedDeviceId.value, {
        beforeTs: oldest.timestamp || oldest.time,
        beforeId: oldest.numericId || oldest.id,
      }))
      const older = sortSmsMessagesAsc(normalizeSmsList(payload))
      if (!older.length) {
        hasMoreHistory.value = false
        return
      }
      messages.value = sortSmsMessagesAsc([...older, ...messages.value])
      hasMoreHistory.value = older.length >= THREAD_LIMIT
      await nextTick()
      if (container) {
        const nextHeight = container.scrollHeight
        container.scrollTop = prevTop + (nextHeight - prevHeight)
      }
    } catch (err) {
      error.value = err?.message || '历史短信加载失败'
    } finally {
      historyLoading.value = false
    }
  }

  async function scrollThreadToBottom() {
    await nextTick()
    requestAnimationFrame(() => {
      const el = threadRef.value
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  function onThreadScroll(event) {
    const el = event?.target
    if (!el || historyLoading.value || !hasMoreHistory.value) return
    if (el.scrollTop <= 80) void loadOlderMessages()
  }

  async function selectDevice(deviceId) {
    const nextId = String(deviceId || 'all')
    if (selectedDeviceId.value === nextId) return
    selectedDeviceId.value = nextId
    selectedContactKey.value = ''
    messages.value = []
    hasMoreHistory.value = false
    syncRoute()
    await loadContacts()
  }

  async function selectContact(contactKey) {
    if (!contactKey || selectedContactKey.value === contactKey) return
    selectedContactKey.value = contactKey
    messages.value = []
    hasMoreHistory.value = false
    syncRoute()
    await loadThread()
  }

  async function refreshAll({ silent = false } = {}) {
    await Promise.all([loadDevices(), loadContacts({ silent })])
    if (selectedContact.value) await loadThread({ silent, scrollToBottom: !silent })
  }

  async function sendReply() {
    const contact = selectedContact.value
    const text = draft.value.trim()
    if (!contact || !text || sending.value) return false

    const body = {
      phone: contact.peer,
      message: text,
    }
    if (selectedDeviceId.value && selectedDeviceId.value !== 'all') {
      body.device_id = selectedDeviceId.value
    } else if (contact.deviceId) {
      body.device_id = contact.deviceId
    }

    sending.value = true
    error.value = ''
    try {
      await sendSms(body)
      draft.value = ''
      await loadContacts({ silent: true })
      await loadThread({ silent: true, scrollToBottom: true })
      return true
    } catch (err) {
      error.value = err?.message || '短信发送失败'
      return false
    } finally {
      sending.value = false
    }
  }

  onMounted(async () => {
    if (!configured.value) return
    await refreshAll({ silent: true })
    if (selectedContactKey.value && !selectedContact.value && contacts.value.length) {
      selectedContactKey.value = ''
      syncRoute()
    }
    if (!selectedContactKey.value && contacts.value.length) {
      await selectContact(contacts.value[0].key)
    } else if (selectedContact.value) {
      await loadThread({ silent: true })
    }
  })

  return {
    configured,
    devices,
    contacts,
    filteredContacts,
    messages,
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
    scrollThreadToBottom,
  }
}
