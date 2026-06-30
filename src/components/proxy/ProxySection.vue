<script setup>
defineProps({
  sectionId: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  subtitleBadgeClass: { type: String, default: 'ob-info-badge--ready' },
  count: { type: Number, default: 0 },
  empty: { type: Boolean, default: false },
})
</script>

<template>
  <section class="proxy-section" :data-section="sectionId">
    <header class="proxy-section__head panel-card panel-neutral section-card">
      <div class="proxy-section__head-row">
        <div class="proxy-section__titles">
          <h2 class="proxy-section__title page-title">{{ title }}</h2>
          <div
            v-if="subtitle"
            class="ob-info-badge proxy-section__desc"
            :class="subtitleBadgeClass"
          >
            <span class="ob-info-badge__dot"></span>
            <span class="ob-info-badge__text">{{ subtitle }}</span>
          </div>
        </div>
        <span v-if="count > 0" class="proxy-section__badge">{{ count }}</span>
      </div>
    </header>

    <div class="proxy-section__grid panel-card panel-neutral section-card">
      <div v-if="!empty" class="proxy-section__body">
        <slot />
      </div>
      <div v-else class="proxy-section__empty">暂无数据</div>
    </div>
  </section>
</template>

<style scoped>
.proxy-section + .proxy-section {
  margin-top: 20px;
}

.proxy-section__head {
  margin-bottom: 10px;
  padding: 14px 12px !important;
}

.proxy-section__head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.proxy-section__title {
  margin: 0;
  font-size: 15px;
  line-height: 1.2;
}

.proxy-section__desc {
  margin-top: 9px;
  width: fit-content;
  max-width: 100%;
  padding: 6px 8px;
  font-size: 11px;
  line-height: 1.35;
}

.proxy-section__badge {
  flex-shrink: 0;
  min-width: 24px;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: #93c5fd;
  background: rgba(96, 165, 250, 0.12);
  border: 1px solid rgba(96, 165, 250, 0.28);
}

[data-theme='light'] .proxy-section__badge {
  color: #2563eb;
  background: rgba(79, 140, 255, 0.12);
  border-color: rgba(79, 140, 255, 0.2);
}

.proxy-section__grid {
  padding: 12px;
  overflow: hidden;
}

.proxy-section__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.proxy-section__empty {
  padding: 24px;
  text-align: center;
  font-size: var(--fs-sm, 13px);
  color: var(--text-muted);
}
</style>
