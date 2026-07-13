# OneBoard Android UI 设计规范

> **原则**：信息架构 / 页面结构 / 交互节奏对齐 Web OneBoard；配色 / 材质 / 主题系统参考 OneIMS。  
> **状态**：设计定稿（可进入实现） · 2026-07-13  
> **证据源**：`onebord/src/**` CSS 主题 · `OneIMS/.../ui/theme/Theme.kt` · `sidebarNav.js`

---

## 1. 设计目标

| 维度 | 跟谁对齐 | 不跟谁 |
|------|----------|--------|
| 导航模块与路由语义 | OneBoard Web（监控 / 控制 / 系统） | — |
| 页面信息层级（Hero → 分组卡 → 列表行） | OneBoard Web | — |
| 配色 / 语义色 / 主题模式 | OneIMS Material 3 | Web 玻璃霓虹色、mint 激活绿 |
| 材质语言 | OneIMS 扁平 Surface + 大圆角 | Web 强 blur 玻璃拟态 |
| 移动导航容器 | OneIMS 悬浮 Dock / 大屏 Rail | Web 左侧 floating sidebar 原样搬到手机 |

**一句话**：看起来是「OneBoard 的功能与布局逻辑」，摸起来是「OneIMS / Pixel 的颜色与触感」。

---

## 2. 冲突裁决（必须先定）

| 冲突点 | Web OneBoard | OneIMS | **Android 定稿** |
|--------|--------------|--------|------------------|
| 主色 | 深 `#8ab4f8` / 浅 `#4F8CFF` | `#0B57D0` / 动态色 `#A9C7FF` | **用 OneIMS primary**（默认可开 Material You） |
| 品牌识别 | 无独立红标 | `#D6242F` 闪屏/图标/Rail | **保留品牌红**作启动与 Mark，不进 primary |
| 激活导航色 | mint `#86efac` / teal `#0f766e` | `primary` 选中 | **用 primary**，弃 mint |
| 背景 | 紫黑宇宙 / 浅蓝 mesh | `#F9F9FF` / `#111318` | **用 OneIMS background/surface** |
| 卡片材质 | backdrop-filter 玻璃 | surfaceContainer* 扁平 | **扁平 Surface**；仅 Dock `alpha≈0.94` |
| 成功色 | `#81c995` / `#059669` | 无独立 success，用 primaryContainer | **跟 OneIMS**：成功 = primaryContainer |
| 手机导航 | ≤900px 侧栏改顶部块 | 底悬浮 Dock + ≥720dp Rail | **底 Dock（三主模块）+ 更多进抽屉** |
| 主 CTA | accent 蓝按钮 | 白底黑字药丸 | **跟 OneIMS PrimaryButton**（白/黑） |

---

## 3. 信息架构（保持 Web 一致）

### 3.1 模块（来自 `sidebarNav.js`）

| 模块 ID | 标签 | 页面 |
|---------|------|------|
| `monitor` | 监控 | 仪表盘、Vohive设备、短信中心、DNS 监控 |
| `control` | 控制 | WIFICALL、规则、订阅、Proxy |
| `system` | 系统 | 设置、日志 |
| 辅助 | — | 帮助/关于、退出登录 |

### 3.2 手机导航映射

```
底部悬浮 Dock（对齐 OneIMS DockIsland）
├─ 监控  → 默认进仪表盘；同模块页用顶栏 Tab / 分段切换
├─ 控制  → 默认进 WIFICALL（core 模块）
├─ 系统  → 默认进设置
└─ 「更多」抽屉：帮助、主题、退出、跨模块快捷入口

大屏 ≥720dp：左侧 NavigationRail + 品牌红 Mark（对齐 OneIMS）
```

### 3.3 页面骨架（每页统一）

```
Scaffold(background)
  ├─ TopAppBar（标题 = Web 页名；可选副标题主机/状态）
  ├─ StatusHero（可选，对齐 Web status-hero / OneIMS StatusHero）
  ├─ 分组卡 SettingsGroup 式（surfaceContainerLow，圆角 20dp）
  │    └─ 行项目 72dp 最小高度
  └─ 底 Dock（主壳级，非每页重复）
```

---

## 4. 色板 Token（OneIMS 真源）

### 4.1 品牌层

| Token | 值 | 用途 |
|-------|-----|------|
| `brandRed` | `#D6242F` | Splash、Launcher、Rail Logo |
| CTA fill/text | `#FFFFFF` / `#000000` | 主确认按钮（不跟 primary） |

### 4.2 交互层 — 浅色静态回退

| Token | HEX | 映射自 Web |
|-------|-----|------------|
| primary | `#0B57D0` | ← 替换 `--accent` |
| primaryContainer | `#D7E3FF` | ← 替换 glass-blue / 成功底 |
| background / surface | `#F9F9FF` | ← 替换 `--bg-base` / mesh |
| onSurface | `#1A1B20` | ← `--text-primary` |
| onSurfaceVariant | `#44474F` | ← `--text-secondary/muted` |
| secondaryContainer | `#DBE2F9` | ← 非危险提示底 |
| error | `#BA1A1A` | ← `--danger` |
| errorContainer | `#FFDAD6` | ← 危险/未就绪 Hero |

### 4.3 交互层 — 深色静态回退

| Token | HEX |
|-------|-----|
| primary | `#A9C7FF` |
| primaryContainer | `#00468B` |
| background / surface | `#111318` |
| onSurface | `#E2E2E9` |
| onSurfaceVariant | `#C4C6D0` |
| error | `#FFB4AB` |
| errorContainer | `#93000A` |

### 4.4 主题模式（两边都有，统一到 OneIMS 语义）

| 模式 | 行为 |
|------|------|
| SYSTEM | 跟随系统（默认） |
| LIGHT / DARK | 强制 |
| dynamicColor | 默认 **true**（Material You）；关闭则用上表静态板 |

---

## 5. 形状与间距（融合）

| Token | 定稿 | 来源 |
|-------|------|------|
| cardCorner | **20dp** | OneIMS `OneImsTokens` ≈ Web `--radius-card` |
| hero / dialog | **32dp** | OneIMS extraLarge ≈ Web shell 28–32 |
| dock island | **28dp** | OneIMS |
| 行高 | **≥72dp** | OneIMS（触控友好，优于 Web 12.5px 字号密度） |
| 水平边距 | **20dp** | OneIMS；Web gutter 28 在手机上改为 16–20 |
| 分组间距 | **12dp** | OneIMS itemSpacing |

**禁止**：`backdrop-filter` 强模糊、多色 radial mesh 背景、Bebas Neue 展示字（Android 用 SansSerif SemiBold）。

**允许的轻微氛围**：Dock `surfaceContainerHigh` + alpha 0.94；选中态用 primary 而非发光边。

---

## 6. 组件对照表（实现清单）

| Web 组件/模式 | Android 目标组件 | 色/形约束 |
|---------------|------------------|-----------|
| Sidebar dock | 底 Dock + 大屏 Rail | 选中 = primary |
| ThemeToggle | Settings 主题三态 + 动态色开关 | 同 OneIMS Settings |
| glass / glass-frame 卡 | `SettingsGroup` / Surface 卡 | surfaceContainerLow，无 blur |
| status-pill | FilterChip / 小 Pill | ready→primaryContainer；fail→error |
| Status Hero | `StatusHero` | 同 OneIMS |
| 主按钮 `.btn` accent | `OneImsPrimaryButton` | 白底黑字 |
| Toast | Snackbar | onSurface 语义 |
| 登录页 | 独立全屏 + brandRed 顶部条可选 | 表单用 M3 OutlinedTextField |

---

## 7. 关键页面 UI 草图（文字线框）

### 7.1 仪表盘（监控 · 默认）

```
┌─────────────────────────────┐
│ 仪表盘            主机 · ●  │
├─────────────────────────────┤
│ ┌ StatusHero ─────────────┐ │
│ │ 运行中 / 流量摘要        │ │
│ └─────────────────────────┘ │
│ ┌ 流量 / 节点 分组卡 ─────┐ │
│ │ 行 · 行 · 行             │ │
│ └─────────────────────────┘ │
│ ┌ 快捷入口 ───────────────┐ │
│ │ DNS · 设备 · 短信 …      │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│   ( 监控 )  控制   系统     │  ← 悬浮 Dock
└─────────────────────────────┘
```

### 7.2 控制 · WIFICALL

结构同 Web Nodes：Hero（连接态）+ 节点列表卡 + 主 CTA「应用/切换」。

### 7.3 系统 · 设置

完全复用 OneIMS Settings 分组视觉；外观项含主题模式 + 动态色。

---

## 8. 无障碍与触控

- 对比度：遵循 M3 on* 配对，不自造半透明白字压玻璃底  
- 触控热区 ≥ 48dp；列表行 ≥ 72dp  
- `prefers-reduced-motion`：无装饰性无限动画  
- 动态色关闭路径必须可用（静态板已定义）  
- 错误态必须有文案 + error 色，不只靠颜色  

---

## 9. 实现落地建议（下一拍）

1. **优先**：在 Android 工程建立 `OneBoardTheme`，直接复用 / 抽离 OneIMS `Theme.kt` + `OneImsTokens` + BrandRed  
2. **壳层**：MainScaffold = TopBar + NavHost + Dock（三模块）  
3. **首屏**：登录 + 仪表盘 + 设置（验证色板与导航）  
4. **再迁**：控制模块页、VoHive、日志  

工程落点二选一（需哥哥拍板）：
- A. 新建 `OneBoard` Android 模块，依赖共享 UI 主题  
- B. 在现有 `OneIMS` 内增加 OneBoard 功能入口（共享 Theme 成本最低）

---

## 10. 验收标准（UI）

- [ ] 深/浅/系统三态切换无色漂、无闪屏红以外的硬编码霓虹色  
- [ ] 导航模块与 Web `NAV_MODULES` 一一对应，无丢页  
- [ ] 主色来自 OneIMS scheme；品牌红仅启动/Mark  
- [ ] 无强玻璃 blur；卡片为 Surface 层级  
- [ ] 手机 Dock 可用；≥720dp 切 Rail  
- [ ] 主 CTA 为白底黑字药丸  

---

*文档归属：OneBoard 移动端设计。配色真源以 OneIMS `Theme.kt` 为准；IA 真源以 `sidebarNav.js` 为准。*
