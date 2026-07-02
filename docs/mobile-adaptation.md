# OneBoard 移动端适配与 iOS / Android 系统特性

> 版本：v1.1 · 2026-07 · 本文档与代码事实一一对应，改动时请同步更新。

## 一、能力总览

| 能力 | iOS (Safari/标准 WebView) | Android (Chrome/WebView) | 实现位置 |
|---|---|---|---|
| 添加到主屏幕（独立窗口运行） | `apple-mobile-web-app-capable` | W3C `manifest.webmanifest` | `index.html` / `public/manifest.webmanifest` |
| 桌面图标 | `apple-touch-icon.png` 180×180 | manifest icons 192/512（含 maskable 自适应） | `public/` / `public/icons/` |
| 状态栏 / 系统栏着色 | `black-translucent` 沉浸式状态栏 | `theme-color`（明暗双值 + 运行时联动） | `index.html` / `src/stores/theme.js` |
| 刘海 / 灵动岛 / Home 指示条避让 | `viewport-fit=cover` + `env(safe-area-inset-*)` | 同左（打孔屏/手势条） | `index.html` / `src/assets/mobile.css` |
| 地址栏收展视口稳定 | `100dvh` 动态视口（`@supports` 渐进增强） | 同左 | `src/assets/mobile.css` |
| 防聚焦自动放大 | 移动端输入控件字号 ≥16px | 不受影响（顺带统一） | `src/assets/mobile.css` |
| 防误识别电话号码 | `format-detection: telephone=no`（ICCID/端口保护） | — | `index.html` |
| 触控体验 | 44px 热区 / 去点按高亮 / 惯性滚动 / 去 hover 残留 | 同左 + `touch-action: manipulation` | `src/assets/mobile.css` |

未引入 Service Worker：控制面板以实时数据为核心，离线缓存易造成状态陈旧，刻意不做。

## 二、移动端布局（≤900px）

- 侧边栏变形为「顶部玻璃导航坞」：吸顶（sticky + 安全区偏移），铭牌横排（头像 + 用户名/主机名 + 主题胶囊），导航变为横向滑动胶囊 chip，两端渐隐提示可滚动。纯 CSS 变形，不改 `Sidebar.vue` DOM。
- 页面留白从 28px 收紧至 12px，并用 `max(12px, env(safe-area-inset-*))` 兜底异形屏。
- 首屏骨架（`index.html` boot-critical）同步移动端形态，避免首帧闪跳。
- 小屏（≤900px）隐藏仪表盘 Hero 装饰电路，首屏优先展示真实指标。
- 弹窗编辑器（规则/订阅/正则/YAML 导入）最大高度改用 `88dvh`，内衬避开安全区；Toast 在 ≤640px 变为顶部横幅。

## 三、关键文件

| 文件 | 职责 |
|---|---|
| `src/assets/mobile.css` | 移动端适配层（main.js 最后引入，靠 cascade 覆盖；6 个分区见文件头注释） |
| `public/manifest.webmanifest` | PWA 清单（standalone / 明暗主题色 / maskable 图标） |
| `scripts/generate-pwa-icons.mjs` | 零依赖 PNG 图标生成器（品牌环形 Logo，改图标后重跑：`node scripts/generate-pwa-icons.mjs`） |
| `src/stores/theme.js` | `applyTheme()` 同步 `meta[theme-color]`，切主题时系统栏颜色跟随 |
| `server/gateway.js` | 新增 `.webmanifest` → `application/manifest+json` MIME |

## 四、验证记录

- `npm run build` 通过（vite 8，246 modules）；产物含 dvh×14、safe-area×8、sticky 导航坞、44px 热区规则。
- `npm run preview` 冒烟：`/manifest.webmanifest` 200 + 正确 MIME；`/apple-touch-icon.png`、`/icons/icon-maskable-512.png` 200。
- 真机建议自查清单：
  1. iPhone Safari「添加到主屏幕」→ 图标为黑底白环，启动无浏览器栏，状态栏沉浸；
  2. Android Chrome 菜单「安装应用」→ 自适应图标裁形正常（圆/方/水滴）；
  3. 明暗主题切换时状态栏颜色跟随；
  4. 竖屏浏览各页面无横向溢出，顶部导航坞可横滑并吸顶。
