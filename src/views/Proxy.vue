<script setup>
import { computed, onMounted, reactive } from 'vue'
import CountryNodeCard from '../components/CountryNodeCard.vue'
import InlineDetailPanel from '../components/InlineDetailPanel.vue'
import InlineExpandGrid from '../components/InlineExpandGrid.vue'
import ProxySection from '../components/proxy/ProxySection.vue'
import { useAppStore } from '../stores/app'
import { mihomoSyncState, refreshProxiesNow } from '../stores/mihomoSync'
import {
  PROXY_SECTION_META,
  partitionProxyGroups,
  resolveMemberList,
} from '../utils/proxySections'
import {
  guessCountryCode,
  isNodeAvailable,
  isWifiProxyGroup,
  nodeLatencySortKey,
} from '../utils/countryNodes'

const { state, selectStrategyItem } = useAppStore()

/** 各分区独立选中态，禁止跨区；同一分区内仅一项 inline 展开 */
const sectionActive = reactive({
  strategy: null,
  nodes: null,
})

const partitioned = computed(() =>
  partitionProxyGroups(state.proxyGroups.filter((g) => !isWifiProxyGroup(g.code))),
)

function membersForItem(sectionId, item) {
  if (!item) return []
  return resolveMemberList(item, state.nodes)
    .sort((a, b) => nodeLatencySortKey(a) - nodeLatencySortKey(b))
}

function activateInSection(sectionId, code) {
  sectionActive[sectionId] = sectionActive[sectionId] === code ? null : code
}

function groupOnlineRate(group) {
  if (!group.count) return 0
  return Math.round((group.online / group.count) * 100)
}

function selectInGroup(group, memberName) {
  selectStrategyItem(group.code, memberName)
}

function isGroupMemberSelected(group, member) {
  return group.now === member.name
}

function memberRegion(member) {
  return member.region || guessCountryCode(member.name)
}

function memberDelay(member) {
  const node = state.nodes.find((n) => n.name === member.name)
  return node?.delay ?? 0
}

function memberAvailable(member) {
  const node = state.nodes.find((n) => n.name === member.name)
  if (!node) return true
  return isNodeAvailable(node)
}

onMounted(() => {
  void refreshProxiesNow()
})
</script>

<template>
  <div class="proxy-page">
    <header class="proxy-page__head panel-card panel-neutral section-card">
      <h1 class="page-title">Proxy 控制</h1>
      <div
        class="ob-info-badge proxy-page__desc"
        :class="{
          'ob-info-badge--ready': mihomoSyncState.connected,
          'ob-info-badge--warn': !mihomoSyncState.connected,
        }"
      >
        <span class="ob-info-badge__dot"></span>
        <span class="ob-info-badge__text">
          {{ state.proxyGroups.length }} 组 · {{ state.system.onlineNodes }}/{{ state.system.totalNodes }} 节点 ·
          API {{ mihomoSyncState.connected ? '已连接' : '离线' }}
          <template v-if="mihomoSyncState.lastSyncAt">
            · 同步 {{ new Date(mihomoSyncState.lastSyncAt).toLocaleTimeString('zh-CN', { hour12: false }) }}
          </template>
        </span>
      </div>
    </header>

    <!-- 1 Strategy -->
    <ProxySection
      section-id="strategy"
      :title="PROXY_SECTION_META.strategy.title"
      :subtitle="PROXY_SECTION_META.strategy.subtitle"
      :count="partitioned.strategy.length"
      :empty="!partitioned.strategy.length"
    >
      <InlineExpandGrid
        v-if="partitioned.strategy.length"
        :items="partitioned.strategy"
        item-key="code"
        :active-key="sectionActive.strategy"
        :columns="2"
      >
        <template #card="{ item, expanded }">
          <CountryNodeCard
            variant="group"
            :code="item.region"
            :name="item.name"
            :effective-node="item.now || ''"
            :total="item.count"
            :available="item.online"
            :online-rate="groupOnlineRate(item)"
            :best-delay="item.bestDelay"
            selectable
            :editing="expanded"
            @click="activateInSection('strategy', item.code)"
          />
        </template>

        <template #expand="{ item }">
          <InlineDetailPanel
            :title="`策略 · ${item.name}`"
            :subtitle="membersForItem('strategy', item).length
              ? `共 ${membersForItem('strategy', item).length} 项，点击生效`
              : '暂无成员'"
          >
            <div v-if="membersForItem('strategy', item).length" class="inline-detail-panel__grid">
              <CountryNodeCard
                v-for="member in membersForItem('strategy', item)"
                :key="member.id"
                variant="node"
                compact
                flag-on-effective-only
                :code="memberRegion(member)"
                :name="member.name"
                :total="1"
                :available="memberAvailable(member) ? 1 : 0"
                :online-rate="memberAvailable(member) ? 100 : 0"
                :best-delay="memberDelay(member)"
                selectable
                :active="isGroupMemberSelected(item, member)"
                @click="selectInGroup(item, member.name)"
              />
            </div>
          </InlineDetailPanel>
        </template>
      </InlineExpandGrid>
    </ProxySection>

    <!-- 2 Nodes -->
    <ProxySection
      section-id="nodes"
      :title="PROXY_SECTION_META.nodes.title"
      :subtitle="PROXY_SECTION_META.nodes.subtitle"
      :count="partitioned.nodes.length"
      :empty="!partitioned.nodes.length"
    >
      <InlineExpandGrid
        v-if="partitioned.nodes.length"
        :items="partitioned.nodes"
        item-key="code"
        :active-key="sectionActive.nodes"
        :columns="2"
      >
        <template #card="{ item, expanded }">
          <CountryNodeCard
            variant="group"
            :code="item.region"
            :name="item.name"
            :effective-node="item.now || ''"
            :total="item.count"
            :available="item.online"
            :online-rate="groupOnlineRate(item)"
            :best-delay="item.bestDelay"
            selectable
            :editing="expanded"
            @click="activateInSection('nodes', item.code)"
          />
        </template>

        <template #expand="{ item }">
          <InlineDetailPanel
            :title="`节点 · ${item.name}`"
            :subtitle="membersForItem('nodes', item).length
              ? `共 ${membersForItem('nodes', item).length} 个节点，点击生效`
              : '暂无节点'"
          >
            <div v-if="membersForItem('nodes', item).length" class="inline-detail-panel__grid">
              <CountryNodeCard
                v-for="member in membersForItem('nodes', item)"
                :key="member.id"
                variant="node"
                compact
                flag-on-effective-only
                :code="memberRegion(member)"
                :name="member.name"
                :total="1"
                :available="memberAvailable(member) ? 1 : 0"
                :online-rate="memberAvailable(member) ? 100 : 0"
                :best-delay="memberDelay(member)"
                selectable
                :active="isGroupMemberSelected(item, member)"
                @click="selectInGroup(item, member.name)"
              />
            </div>
          </InlineDetailPanel>
        </template>
      </InlineExpandGrid>
    </ProxySection>
  </div>
</template>

<style scoped>
.proxy-page {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.proxy-page__head {
  margin-bottom: 18px;
}

.proxy-page__desc {
  margin-top: 10px;
  width: fit-content;
  max-width: 100%;
  flex: none;
}
</style>
