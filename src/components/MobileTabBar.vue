<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MIcon from './MIcon.vue'
import { splitMobileNav, NAV_AUXILIARY, matchNavItem } from '../config/sidebarNav'
import { logout } from '../api/auth'
import { useLiquidTabBar } from '../composables/useLiquidTabBar'

const route = useRoute()
const router = useRouter()
const { minimized, keyboardHidden } = useLiquidTabBar()

const { primary, overflow } = splitMobileNav()
const moreOpen = ref(false)
const moreBtnRef = ref(null)
const sheetRef = ref(null)

const isActive = (item) => matchNavItem(route.path, item)
/** 「更多」内任一页处于激活态时，底栏的更多按钮也点亮 */
const moreActive = computed(() => overflow.some((item) => isActive(item)))

// 切路由自动收起抽屉（含从抽屉里点击跳转）
watch(() => route.path, () => {
  moreOpen.value = false
})

function onSheetKeydown(event) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    moreOpen.value = false
  }
}

// 无障碍：开抽屉时焦点移入首个菜单项（键盘可直接上手），
// 关抽屉时归还给「更多」触发按钮，焦点不迷路
watch(moreOpen, async (open) => {
  if (open) {
    document.addEventListener('keydown', onSheetKeydown)
    await nextTick()
    sheetRef.value?.querySelector('[role="menuitem"]')?.focus()
  } else {
    document.removeEventListener('keydown', onSheetKeydown)
    moreBtnRef.value?.focus({ preventScroll: true })
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onSheetKeydown)
})

async function onAux(item) {
  moreOpen.value = false
  if (item.action === 'logout') {
    await logout()
    await router.push('/login')
    return
  }
  if (item.path) {
    await router.push(item.path)
  }
}
</script>

<template>
  <nav
    class="lg-tabbar lg-material"
    :class="{
      'lg-tabbar--min': minimized && !moreOpen,
      'lg-tabbar--hidden': keyboardHidden,
      'lg-tabbar--sheet-open': moreOpen,
    }"
    aria-label="移动端主导航"
    :aria-hidden="moreOpen ? 'true' : undefined"
  >
    <router-link
      v-for="item in primary"
      :key="item.path"
      :to="item.path"
      class="lg-tab"
      :class="{ active: isActive(item) }"
      :aria-current="isActive(item) ? 'page' : undefined"
    >
      <MIcon :name="item.icon" size="md" />
      <span class="lg-tab__label">{{ item.label }}</span>
    </router-link>

    <button
      ref="moreBtnRef"
      type="button"
      class="lg-tab"
      :class="{ active: moreActive || moreOpen }"
      :aria-expanded="moreOpen"
      aria-haspopup="menu"
      @click="moreOpen = !moreOpen"
    >
      <MIcon name="view_module" size="md" />
      <span class="lg-tab__label">更多</span>
    </button>
  </nav>

  <Teleport to="body">
    <Transition name="lg-sheet-pop">
      <div
        v-if="moreOpen"
        class="lg-sheet-backdrop"
        @click.self="moreOpen = false"
      >
        <div ref="sheetRef" class="lg-sheet lg-material" role="menu" aria-label="更多页面">
          <div class="lg-sheet__handle" aria-hidden="true" />
          <div class="lg-sheet__grid">
            <router-link
              v-for="item in overflow"
              :key="item.path"
              :to="item.path"
              class="lg-sheet__item"
              :class="{ active: isActive(item) }"
              role="menuitem"
            >
              <MIcon :name="item.icon" size="md" />
              <span>{{ item.label }}</span>
            </router-link>
          </div>
          <div class="lg-sheet__divider" aria-hidden="true" />
          <div class="lg-sheet__aux">
            <template v-for="item in NAV_AUXILIARY" :key="item.id">
              <router-link
                v-if="item.path"
                :to="item.path"
                class="lg-sheet__aux-btn"
                role="menuitem"
                @click="moreOpen = false"
              >
                <MIcon :name="item.icon" size="sm" />
                {{ item.label }}
              </router-link>
              <a
                v-else-if="item.href"
                :href="item.href"
                class="lg-sheet__aux-btn"
                role="menuitem"
                @click="moreOpen = false"
              >
                <MIcon :name="item.icon" size="sm" />
                {{ item.label }}
              </a>
              <button
                v-else
                type="button"
                class="lg-sheet__aux-btn"
                :class="{ 'lg-sheet__aux-btn--danger': item.action === 'logout' }"
                role="menuitem"
                @click="onAux(item)"
              >
                <MIcon :name="item.icon" size="sm" />
                {{ item.label }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
