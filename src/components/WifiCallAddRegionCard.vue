<script setup>
defineProps({
  tint: { type: Number, default: 0 },
})

defineEmits(['click'])
</script>

<template>
  <button
    type="button"
    class="add-card"
    :class="`tint-${tint % 4}`"
    @click="$emit('click')"
  >
    <div class="add-scrim" aria-hidden="true"></div>

    <div class="add-icon">
      <svg class="add-icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <path d="M12 5v14M5 12h14" stroke-linecap="round" />
      </svg>
    </div>

    <div class="add-body">
      <div class="add-title-row">
        <span class="add-name">添加地区</span>
      </div>
      <div class="add-meta">
        <span class="add-code">NEW</span>
        <span class="meta-dot">·</span>
        <span>点击新增国家和地区</span>
      </div>
    </div>

    <div class="add-watermark" aria-hidden="true">+</div>
  </button>
</template>

<style scoped>
.add-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 96px 14px 14px;
  border-radius: 16px;
  overflow: hidden;
  text-align: left;
  cursor: pointer;
  backdrop-filter: blur(16px) saturate(var(--glass-saturate, 112%));
  -webkit-backdrop-filter: blur(16px) saturate(var(--glass-saturate, 112%));
  border: 1px dashed rgba(255, 255, 255, 0.1);
  min-height: 76px;
  box-shadow: var(--glass-shadow-inset);
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s, background 0.2s;
}

.add-card:hover {
  transform: translateY(-1px);
  border-color: rgba(138, 180, 248, 0.32);
  box-shadow: 0 0 0 1px rgba(138, 180, 248, 0.1), var(--glass-shadow-inset);
}

.add-card:active {
  transform: translateY(0);
}

.tint-0 {
  background:
    radial-gradient(ellipse 80% 100% at 0% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 60%),
    linear-gradient(165deg, rgba(14, 15, 22, 0.92) 0%, rgba(8, 9, 14, 0.96) 100%);
}

.tint-1 {
  background:
    radial-gradient(ellipse 80% 100% at 0% 50%, rgba(167, 139, 250, 0.07) 0%, transparent 60%),
    linear-gradient(165deg, rgba(18, 15, 24, 0.92) 0%, rgba(10, 8, 14, 0.96) 100%);
}

.tint-2 {
  background:
    radial-gradient(ellipse 80% 100% at 0% 50%, rgba(52, 211, 153, 0.06) 0%, transparent 60%),
    linear-gradient(165deg, rgba(12, 18, 16, 0.92) 0%, rgba(7, 11, 10, 0.96) 100%);
}

.tint-3 {
  background:
    radial-gradient(ellipse 80% 100% at 0% 50%, rgba(251, 146, 60, 0.06) 0%, transparent 60%),
    linear-gradient(165deg, rgba(22, 18, 14, 0.92) 0%, rgba(12, 10, 8, 0.96) 100%);
}

.add-scrim {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 62%;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    to right,
    rgba(0, 0, 0, 0.88) 0%,
    rgba(0, 0, 0, 0.72) 45%,
    rgba(0, 0, 0, 0.28) 72%,
    transparent 100%
  );
}

.add-icon {
  position: relative;
  z-index: 2;
  height: 44px;
  width: calc(44px * 3 / 2);
  aspect-ratio: 3 / 2;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.28);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  color: rgba(138, 180, 248, 0.9);
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}

.add-card:hover .add-icon {
  background: rgba(138, 180, 248, 0.12);
  border-color: rgba(138, 180, 248, 0.35);
  color: #8ab4f8;
}

.add-icon-plus {
  width: 22px;
  height: 22px;
}

.add-body {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 2;
}

.add-title-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.add-name {
  min-width: 0;
}

.add-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.add-code {
  padding: 2px 8px;
  border-radius: 6px;
  font-family: var(--mono);
  background: rgba(138, 180, 248, 0.12);
}

.meta-dot { opacity: 0.4; }

.add-watermark {
  position: absolute;
  right: -40px;
  top: 50%;
  font-size: 280px;
  font-weight: 200;
  line-height: 1;
  color: rgba(138, 180, 248, 0.12);
  transform: translateY(-50%) rotate(-12deg);
  pointer-events: none;
  z-index: 0;
  user-select: none;
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    rgba(0, 0, 0, 0.25) 10%,
    #000 24%,
    #000 76%,
    rgba(0, 0, 0, 0.25) 90%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    rgba(0, 0, 0, 0.25) 10%,
    #000 24%,
    #000 76%,
    rgba(0, 0, 0, 0.25) 90%,
    transparent 100%
  );
}

@media (max-width: 640px) {
  .add-card { padding-right: 84px; }
  .add-watermark { font-size: 200px; right: -28px; }
}
</style>
