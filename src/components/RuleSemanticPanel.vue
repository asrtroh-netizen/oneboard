<script setup>
import { computed, reactive, ref, watch } from 'vue'
import RuleSemanticBucketCard from './RuleSemanticBucketCard.vue'
import { buildSemanticBuckets } from '../utils/ruleSemantic'

const props = defineProps({
  rules: { type: Array, default: () => [] },
  group: { type: Object, default: null },
})

const emit = defineEmits(['edit-group'])

const showHidden = ref(false)
const open = reactive({})

const buckets = computed(() => buildSemanticBuckets(props.rules))

const visibleBuckets = computed(() =>
  buckets.value.filter((b) => !b.hiddenByDefault || showHidden.value),
)

const hiddenBuckets = computed(() =>
  buckets.value.filter((b) => b.hiddenByDefault),
)

const totalCount = computed(() => props.rules.length)

watch(
  buckets,
  (list) => {
    for (const b of list) {
      if (open[b.id] === undefined) open[b.id] = false
    }
  },
  { immediate: true },
)

function toggleBucket(id) {
  open[id] = !open[id]
}

function onBucketEdit() {
  emit('edit-group', props.group)
}
</script>

<template>
  <div class="semantic-panel">
    <div class="semantic-panel-head">
      <span class="layer-tag">STRATEGY</span>
      <span class="semantic-panel-title">策略分组</span>
      <span class="semantic-panel-count">{{ totalCount }} 条 · {{ buckets.length }} 类</span>
    </div>

    <div v-if="buckets.length" class="semantic-buckets">
      <section
        v-for="(bucket, i) in visibleBuckets"
        :key="bucket.id"
        class="semantic-bucket"
        :class="{ 'is-open': open[bucket.id] }"
      >
        <button
          type="button"
          class="semantic-bucket-head"
          :aria-expanded="open[bucket.id]"
          @click="toggleBucket(bucket.id)"
        >
          <span class="semantic-bucket-chevron" :class="{ open: open[bucket.id] }">›</span>
          <span class="semantic-bucket-emoji">{{ bucket.emoji }}</span>
          <span class="semantic-bucket-label">{{ bucket.label }}</span>
          <span class="semantic-bucket-count">{{ bucket.count }} 条</span>
        </button>

        <div v-show="open[bucket.id]" class="semantic-bucket-body">
          <RuleSemanticBucketCard
            :bucket="bucket"
            :tint="i"
            @edit="onBucketEdit"
          />
        </div>
      </section>

      <button
        v-if="hiddenBuckets.length && !showHidden"
        type="button"
        class="semantic-reveal-hidden"
        @click="showHidden = true"
      >
        显示 Fallback / 隐藏策略（{{ hiddenBuckets.reduce((s, b) => s + b.count, 0) }} 条）
      </button>
    </div>

    <div v-else class="semantic-empty">
      等待 Mihomo API 返回规则…
    </div>
  </div>
</template>

<style scoped>
.semantic-panel {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.28);
  overflow: hidden;
}

.semantic-panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
}

.layer-tag {
  display: inline-flex;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  font-family: var(--mono, ui-monospace, monospace);
  color: #6ee7b7;
  background: rgba(52, 211, 153, 0.14);
  border: 1px solid rgba(52, 211, 153, 0.28);
}

.semantic-panel-title {
  flex: 1;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 0.04em;
}

.semantic-panel-count {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.45);
  font-variant-numeric: tabular-nums;
}

.semantic-buckets {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 8px;
}

.semantic-bucket + .semantic-bucket {
  margin-top: 4px;
}

.semantic-bucket-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.semantic-bucket.is-open .semantic-bucket-head {
  border-color: rgba(52, 211, 153, 0.32);
  background: rgba(52, 211, 153, 0.06);
}

.semantic-bucket-head:hover {
  border-color: rgba(96, 165, 250, 0.35);
  background: rgba(96, 165, 250, 0.06);
}

.semantic-bucket-chevron {
  width: 14px;
  text-align: center;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  transform: rotate(0deg);
  transition: transform 0.2s ease, color 0.2s ease;
}

.semantic-bucket-chevron.open {
  transform: rotate(90deg);
  color: #6ee7b7;
}

.semantic-bucket-emoji {
  font-size: 16px;
  line-height: 1;
}

.semantic-bucket-label {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
}

.semantic-bucket-count {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.45);
  font-variant-numeric: tabular-nums;
}

.semantic-bucket-body {
  padding: 8px 4px 4px;
}

.semantic-reveal-hidden {
  width: 100%;
  margin-top: 6px;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: 11px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.semantic-reveal-hidden:hover {
  color: rgba(255, 255, 255, 0.72);
  border-color: rgba(255, 255, 255, 0.28);
}

.semantic-empty {
  padding: 20px 12px;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}
</style>
