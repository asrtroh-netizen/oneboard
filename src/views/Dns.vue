<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../stores/app'
import {
  startDnsSyncLayer,
  stopDnsSyncLayer,
  refreshDnsSyncLayer,
  clearDnsMonitor,
  dnsSyncMeta,
} from '../stores/dnsSyncLayer'

const { state, showToast } = useAppStore()
const searchQuery = ref('')
const statusFilter = ref('all')
const typeFilter = ref('all')
const refreshing = ref(false)
const clearing = ref(false)

const lastUpdate = computed(() => {
  if (!dnsSyncMeta.lastUpdateAt) return '—'
  return new Date(dnsSyncMeta.lastUpdateAt).toLocaleTimeString('zh-CN', { hour12: false })
})

const emptyHint = computed(() => {
  if (!dnsSyncMeta.connected) return '正在连接 Mihomo 日志流…'
  return '暂无 DNS 查询记录 · 请产生 DNS 流量（如浏览器访问网站）后自动出现'
})

const filteredLogs = computed(() => state.dns.queryLog.filter((q) => {
  const matchStatus = statusFilter.value === 'all' || q.status === statusFilter.value
  const matchType = typeFilter.value === 'all' || q.type === typeFilter.value
  const q2 = searchQuery.value.toLowerCase()
  const matchSearch = !q2
    || q.domain.toLowerCase().includes(q2)
    || q.sourceIp.includes(q2)
    || q.upstream.includes(q2)
    || q.type.toLowerCase().includes(q2)
    || (q.status === 'success' ? '成功' : '失败').includes(q2)
  return matchStatus && matchType && matchSearch
}))

async function onRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await refreshDnsSyncLayer()
    showToast('DNS 日志已刷新', 'success')
  } catch (err) {
    showToast(err?.message || '刷新失败', 'error')
  } finally {
    refreshing.value = false
  }
}

async function onClear() {
  if (clearing.value) return
  clearing.value = true
  try {
    await clearDnsMonitor({ flushCache: true })
    showToast('DNS 缓存与本地日志已清空', 'success')
  } catch (err) {
    showToast(err?.message || '清空失败', 'error')
  } finally {
    clearing.value = false
  }
}

onMounted(() => startDnsSyncLayer())
onUnmounted(() => stopDnsSyncLayer())
</script>

<template>
  <div>
    <section class="dns-overview">
      <div class="dns-overview__head">
        <div class="card-title">DNS 监控</div>
        <div class="card-sub">实时 DNS 查询统计</div>
      </div>
      <div class="stat-row">
        <div class="dns-stat">
          <div class="dns-stat-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg></div>
          <div class="dns-stat-body">
            <div class="dns-stat-label">总查询数</div>
            <div class="dns-stat-value">{{ state.dns.totalQueries }}</div>
          </div>
        </div>
        <div class="dns-stat">
          <div class="dns-stat-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg></div>
          <div class="dns-stat-body">
            <div class="dns-stat-label">成功查询</div>
            <div class="dns-stat-value">{{ state.dns.successQueries }}</div>
          </div>
        </div>
        <div class="dns-stat">
          <div class="dns-stat-icon red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg></div>
          <div class="dns-stat-body">
            <div class="dns-stat-label">失败查询</div>
            <div class="dns-stat-value">{{ state.dns.failedQueries }}</div>
          </div>
        </div>
        <div class="dns-stat">
          <div class="dns-stat-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
          <div class="dns-stat-body">
            <div class="dns-stat-label">平均响应</div>
            <div class="dns-stat-value">{{ state.dns.avgLatency.toFixed(2) }} ms</div>
          </div>
        </div>
      </div>
    </section>

    <div class="rank-row">
      <div class="card rank-card">
        <div class="rank-header">
          <div><div class="card-title" style="margin:0">域名请求排行</div><div class="card-sub">根据域名统计</div></div>
          <span class="tag tag-orange">Top 10</span>
        </div>
        <ul v-if="state.dns.domainRanking.length" class="rank-list">
          <li v-for="(row, i) in state.dns.domainRanking" :key="row.name" class="rank-item">
            <span class="rank-index">{{ i + 1 }}</span>
            <span class="rank-name">{{ row.name }}</span>
            <span class="rank-count">{{ row.count }}</span>
          </li>
        </ul>
        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          <span>暂无数据</span>
        </div>
      </div>
      <div class="card rank-card">
        <div class="rank-header">
          <div><div class="card-title" style="margin:0">来源 IP 排行</div><div class="card-sub">客户端统计</div></div>
          <span class="tag tag-purple">Top 10</span>
        </div>
        <ul v-if="state.dns.ipRanking.length" class="rank-list">
          <li v-for="(row, i) in state.dns.ipRanking" :key="row.name" class="rank-item">
            <span class="rank-index">{{ i + 1 }}</span>
            <span class="rank-name mono">{{ row.name }}</span>
            <span class="rank-count">{{ row.count }}</span>
          </li>
        </ul>
        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          <span>暂无数据</span>
        </div>
      </div>
    </div>

    <div class="card log-card">
      <div class="log-header">
        <div>
          <span class="card-title" style="margin:0">DNS 查询日志</span>
          <span class="log-count">共 {{ filteredLogs.length }} 条</span>
        </div>
        <span class="update-time">
          <span class="dot-live" :class="{ offline: !dnsSyncMeta.connected }"></span>
          {{ dnsSyncMeta.connected ? '实时' : '未连接' }} · 更新于 {{ lastUpdate }}
        </span>
      </div>

      <div class="filter-bar">
        <input v-model="searchQuery" class="ob-field-input search-input" placeholder="搜索域名 / 类型 / 上游 / 来源 IP / 结果" />
        <select v-model="statusFilter" class="ob-select select-input">
          <option value="all">全部状态</option>
          <option value="success">成功</option>
          <option value="failed">失败</option>
        </select>
        <select v-model="typeFilter" class="ob-select select-input">
          <option value="all">全部类型</option>
          <option value="A">A</option>
          <option value="AAAA">AAAA</option>
        </select>
        <button class="btn btn-primary" :disabled="refreshing" @click="onRefresh">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/></svg>
          {{ refreshing ? '刷新中…' : '刷新' }}
        </button>
        <button class="btn btn-danger" :disabled="clearing" @click="onClear">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2"/></svg>
          {{ clearing ? '清空中…' : '清空' }}
        </button>
      </div>

      <div class="table-wrap">
        <table v-if="filteredLogs.length">
          <thead>
            <tr><th>时间</th><th>域名</th><th>类型</th><th>上游</th><th>来源 IP</th><th>耗时</th><th>状态</th></tr>
          </thead>
          <tbody>
            <tr v-for="(q, i) in filteredLogs" :key="`${q.time}-${q.domain}-${i}`">
              <td class="mono">{{ q.time }}</td>
              <td>{{ q.domain }}</td>
              <td><span class="tag tag-blue">{{ q.type }}</span></td>
              <td class="mono">{{ q.upstream }}</td>
              <td class="mono">{{ q.sourceIp || '—' }}</td>
              <td class="mono">{{ q.latency ? q.latency + ' ms' : '—' }}</td>
              <td><span class="tag" :class="q.status === 'success' ? 'tag-green' : 'tag-red'">{{ q.status === 'success' ? '成功' : '失败' }}</span></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg>
          <span>{{ emptyHint }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dns-overview {
  margin-bottom: 12px;
}

.dns-overview__head {
  margin-bottom: 12px;
}

.dns-overview__head .card-sub {
  margin-bottom: 0;
}

.stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.rank-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
.rank-card { min-height: 200px; }
.rank-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
.rank-list { list-style: none; margin: 0; padding: 0; }
.rank-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--fs-md);
}
.rank-item:last-child { border-bottom: none; }
.rank-index {
  font-family: var(--mono);
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
.rank-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rank-count {
  font-family: var(--mono);
  font-size: var(--fs-sm);
  color: var(--accent);
}
.log-card { margin-top: 12px; padding: 0; overflow: hidden; }
.log-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 20px 0; }
.log-count { font-size: var(--fs-sm); color: var(--text-muted); margin-left: 8px; }
.update-time { font-size: var(--fs-sm); color: var(--green); display: flex; align-items: center; gap: 6px; }
.dot-live { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: pulse 1.5s infinite; }
.dot-live.offline { background: var(--text-muted); animation: none; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.filter-bar { display: flex; gap: 8px; padding: 16px 20px; flex-wrap: wrap; align-items: center; }
.search-input { flex: 1; min-width: 200px; }
.select-input { min-width: 112px; }
.table-wrap { overflow-x: auto; padding: 0 20px 20px; }
table { width: 100%; border-collapse: collapse; font-size: var(--fs-md); }
th { padding: 11px 12px; text-align: left; color: var(--text-muted); font-size: var(--fs-sm); border-bottom: 1px solid var(--border-subtle); font-weight: 500; }
td { padding: 11px 12px; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); font-size: var(--fs-md); }
tr:hover td { background: var(--bg-hover); }
.mono { font-family: var(--mono); font-size: var(--fs-base); color: var(--text-muted); }
@media (max-width: 900px) { .stat-row, .rank-row { grid-template-columns: 1fr; } }
</style>
