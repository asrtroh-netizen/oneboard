# 移动端显示不全修复说明（2026-07-19）

## 现象

手机浏览器打开 OneBoard 控制面板网页时，内容被裁切 / 滚不到底 / 安全区顶死。

## 根因

工作区相对已提交的移动端适配层（`51cabd6` / `d35ddbd`）发生了**未提交删除**：

- `src/assets/mobile.css`（`100dvh`、safe-area、底部让位）
- `src/assets/liquid-glass.css`
- `src/components/MobileTabBar.vue` + `useLiquidTabBar.js`
- `index.html` 的 `viewport-fit=cover` 与 PWA meta
- `MainLayout` 中的 `<MobileTabBar>` 挂载
- `main.js` 中对 mobile/liquid 的引入

基座 `MainLayout` 仍是 `100vh + overflow: hidden`，失去适配层覆盖后，小屏极易裁切。

## 处置

从 `HEAD` 精确恢复上述移动端相关文件；**未改动**无关的 server 侧脏改动。

## 验收建议

1. `npm run dev` 后 DevTools / 真机宽度 ≤900px
2. 滚动各主页面到底，确认不被底栏/地址栏裁切
3. iOS Safari：地址栏收展时布局不跳动（依赖 `100dvh`）
4. 刘海机：顶部/底部 safe-area 留白正常

## 本机窄屏冒烟（2026-07-19）

- 命令：`npm run dev`（`http://localhost:5173/`）+ Playwright 390×844 / 375×812 / 768×1024
- 脚本：`scripts/mobile-narrow-smoke.mjs`（登录页）；主壳验收用一次性临时口令登录后**立即还原** `users.json`
- 结果：登录卡完整可见、无横向溢出；主壳 `.layout` 高度贴合视口、`padding-bottom: 96px`、`.lg-tabbar` 悬浮底栏在、`.content` 可滚
- 截图目录：`release/mobile-smoke/`（本地产物，可不入库）

## 「更多」菜单点不动（三次修复）

- **现象**：底部「更多」抽屉里部分项点了没反应
- **根因**：
  1. iOS 上 `fixed` + `transform` 的底栏可能叠在 sheet 底部命中区之上
  2. 「帮助 / 关于」原为 `href="#"` 死链，点了只加 hash、不跳页
- **修复**：
  - 打开抽屉时底栏 `pointer-events: none` + 降 z-index；backdrop 提到 `z-index: 200`
  - sheet 可滚动、菜单项 `position:relative; z-index:1; touch-action:manipulation`
  - 帮助改为跳转 `/settings`（版本/关于信息在设置页）；Sidebar 同步支持 `path`
- **复验**：Playwright 命中测试 `allHit=true`、`covered=false`、`helpHref=/settings`；DNS/规则/订阅等可导航

## 纵向滑动截断（二次修复）

- **现象**：左右 OK，向下滑底部被裁切
- **根因**：`MainLayout` 在 ≤900px 把 `.app-shell` 设为 `height:auto; overflow:visible`，壳随内容长高，再被 `.layout` 的 `overflow:hidden` 裁掉；`.content` 未形成真实滚动视口
- **修复**：
  - `MainLayout.vue`：小屏改为 layout 列 flex → shell `flex:1; min-height:0; overflow:hidden` → content `overflow-y:auto`
  - `mobile.css`：用 `100dvh` + 同构滚动链 `!important` 加固
- **复验（390×844 Dashboard）**：`content.scrollHeight=2017 > clientHeight=626`，滚到底 `atEnd`，末块在 Tab 上方且在 layout 内
