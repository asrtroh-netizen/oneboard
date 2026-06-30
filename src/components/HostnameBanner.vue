<script setup>
/**
 * @deprecated Prefer stream-hero on Dashboard. Kept for backward-compatible imports.
 */
defineProps({
  hostname: { type: String, default: 'Catone' },
  subtitle: { type: String, default: '很高兴在这里见到你…' },
})
</script>

<template>
  <section class="stream-hero panel-card panel-neutral hostname-banner">
    <div class="stream-hero__media" aria-hidden="true" />
    <div class="stream-hero__scrim" aria-hidden="true" />
    <div class="stream-hero__light" aria-hidden="true" />

    <div class="stream-hero__mascot" aria-hidden="true">
      <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g class="hero-mascot-shape">
          <rect x="38" y="108" width="84" height="32" rx="16" />
          <rect x="36" y="48" width="88" height="72" rx="26" />
          <path d="M46 58 L36 18 L58 48 Z" />
          <path d="M114 58 L124 18 L102 48 Z" />
          <circle cx="62" cy="78" r="7" class="hero-mascot-eye" />
          <circle cx="98" cy="78" r="7" class="hero-mascot-eye" />
          <rect x="70" y="90" width="20" height="12" rx="6" class="hero-mascot-nose" />
          <path d="M64 106 H96" class="hero-mascot-mouth" stroke-width="2.5" stroke-linecap="round" />
        </g>
      </svg>
    </div>

    <div class="stream-hero__body">
      <div class="stream-hero__greet">
        <h1 class="stream-hero__title stream-hero__title--greet">
          你好，<span class="stream-hero__hostname">{{ hostname }}</span>，
        </h1>
        <div class="ob-info-badge ob-info-badge--ready stream-hero__sys-badge">
          <span class="ob-info-badge__dot"></span>
          <span class="ob-info-badge__text">{{ subtitle }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hostname-banner {
  position: relative;
  min-height: clamp(168px, 24vh, 220px);
  margin-bottom: var(--space-section);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.stream-hero__body {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: clamp(168px, 24vh, 220px);
  padding: 28px 220px 28px 28px;
}

.stream-hero__greet {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  max-width: min(100%, 640px);
}

.stream-hero__title--greet {
  margin: 0;
  font-size: clamp(22px, 3vw, 30px);
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 1.35;
  color: var(--text-primary);
}

.stream-hero__hostname {
  font-weight: 700;
  font-size: clamp(26px, 3.4vw, 34px);
}

.stream-hero__sys-badge {
  max-width: 100%;
}

.stream-hero__mascot {
  position: absolute;
  right: -24px;
  top: 50%;
  transform: translateY(-46%);
  width: 240px;
  height: 210px;
  pointer-events: none;
  z-index: 1;
  opacity: 0.75;
  -webkit-mask-image: linear-gradient(105deg, transparent 0%, #000 28%, #000 92%, transparent 100%);
  mask-image: linear-gradient(105deg, transparent 0%, #000 28%, #000 92%, transparent 100%);
}

.stream-hero__mascot svg {
  width: 100%;
  height: 100%;
  display: block;
}

.hero-mascot-shape :is(rect, path) {
  fill: rgba(255, 255, 255, 0.32);
}

.hero-mascot-eye {
  fill: rgba(0, 0, 0, 0.25);
}

.hero-mascot-nose {
  fill: rgba(255, 255, 255, 0.9);
}

.hero-mascot-mouth {
  stroke: rgba(255, 255, 255, 0.85);
  fill: none;
}

.stream-hero__media {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 75% at 18% 100%, rgba(110, 181, 255, 0.2) 0%, transparent 62%),
    radial-gradient(ellipse 45% 40% at 88% 12%, rgba(255, 255, 255, 0.06) 0%, transparent 58%),
    linear-gradient(125deg, #2a3548 0%, #1e2635 52%, #171c28 100%);
}

.stream-hero__scrim {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.42) 0%, rgba(0, 0, 0, 0.12) 48%, transparent 100%),
    linear-gradient(0deg, rgba(0, 0, 0, 0.35) 0%, transparent 55%);
}

.stream-hero__light {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 50% 60% at 88% 22%, rgba(255, 255, 255, 0.14) 0%, transparent 62%);
  pointer-events: none;
}

@media (max-width: 640px) {
  .stream-hero__body {
    padding: 22px 160px 22px 18px;
  }

  .stream-hero__mascot {
    width: 180px;
    height: 158px;
    right: -18px;
  }
}
</style>
