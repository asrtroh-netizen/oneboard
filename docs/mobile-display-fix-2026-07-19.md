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
