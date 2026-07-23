# 规则页同步报错排查（2026-07-24）

## 现象

Web 规则页点击「同步」失败；访问入口 `http://192.168.1.88:8866`。

## 根因

| 证据 | 结果 |
|---|---|
| `GET /mihomo/version` | `502 {"error":"Invalid upstream: "}` |
| Agent snapshot | `mihomo.upstream: ""` |
| `GET http://192.168.1.88:9090/version` | `401 Unauthorized`（内核在线） |
| 带 `X-OneBord-Clash-Upstream: http://192.168.1.88:9090` | 代理成功透传 401 |

规则同步经网关 `/mihomo` 反代到 **Clash external-controller**。未在设置页配置主机/端口时 upstream 为空；把网关 `:8866` 当成 Clash 地址也会失败。正确目标通常是 `:9090`，并需填写与内核一致的 Secret。

## 修复（代码）

- 前端：`clarifyClashHttpError` 把 502/Invalid upstream/401 转成可行动提示
- 规则页：同步前检查 `isClashBackendConfigured()`
- 设置页：明确「不是网关 8866」文案
- 网关：空 upstream 返回更明确的 502 文案

## 人工操作（仍需）

1. 设置 → 透明代理后端：主机 `192.168.1.88`，端口 `9090`，Secret = 内核 secret  
2. 「保存并连接」  
3. 回规则页再点「同步」

部署：需把本次 `onebord` 改动发布到 `192.168.1.88:8866` 后，新文案才在线上可见。
