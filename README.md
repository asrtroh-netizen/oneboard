# 🚀 OneBoard

⚡ Glass-Engineered Multi-System Control Plane  
⚡ 玻璃拟态多系统控制中枢



📸 实际界面展示：

![OneBoard UI 1](https://i.ibb.co/5gfYTTxG/b5876537e014fcb3b7624831de182559.jpg)

![OneBoard UI 2](https://i.ibb.co/fY8x3xCM/2c1544aa4cf7fdb66984cf0203228bbf.jpg)

![OneBoard UI 3](https://i.ibb.co/277GY185/3971983c6abd3725c220f0fc6ecbad8c.jpg)

![OneBoard UI 4](https://i.ibb.co/kZv7r42/35b88e6bd99c16f6b47ef9494113dbc9.jpg)

![OneBoard UI 5](https://i.ibb.co/zWZJQ2F9/f0aef2ad91e60dc02df890422098401a.jpg)


---

## 🌍 Overview / 项目概述

🚀 OneBoard is a unified control plane designed for modern distributed network infrastructure. It integrates Mihomo, VoHive, OpenClash, and Docker systems into a single coherent operational dashboard with real-time state synchronization and multi-backend orchestration.

🚀 OneBoard 是一个统一控制中枢系统，用于现代分布式网络架构，将 Mihomo、VoHive、OpenClash 与 Docker 等系统整合为一个统一可视化操作平台，实现实时状态同步与多后端控制。

---

## ⚡ Core Features / 核心功能

🧠 Multi-backend orchestration (Mihomo / VoHive / Clash)  
🧠 多后端统一调度（Mihomo / VoHive / Clash）

📡 Real-time traffic & device monitoring  
📡 实时流量与设备监控

💳 SIM / eSIM lifecycle control  
💳 SIM / eSIM 生命周期管理

💬 Messaging center integration (SMS)  
💬 短信中心集成

🌐 Smart proxy routing engine  
🌐 智能代理路由系统

🎨 Glass UI (light & dark mode)  
🎨 玻璃拟态界面（明暗模式）

🐳 Docker multi-architecture deployment  
🐳 Docker 多架构部署支持

⚡ ARM / x86 / NAS / OpenWrt support  
⚡ 支持 ARM / x86 / NAS / OpenWrt

🔄 Auto backend switching (no stale state)  
🔄 自动后端切换（无状态残留）

---

## 🚀 Quick Start / 快速启动

📦 Pull Image / 拉取镜像

docker pull ghcr.io/asrtroh-netizen/oneboard:latest

---

🐳 Run Container / 运行容器

docker run -d --name oneboard --restart unless-stopped -p 8866:8866 ghcr.io/asrtroh-netizen/oneboard:latest

---

🌐 Access / 访问地址

http://localhost:8866  
http://YOUR-IP:8866

---

## 🔐 Default Login / 默认登录

Username / 用户名: admin  
Password / 密码: admin  

⚠️ Change after first login / 首次登录后请修改密码

---

## 🧱 Architecture / 系统架构

Frontend / 前端: Vue 3 + Vite  
Backend / 后端: Node.js Gateway  
Adapters / 适配层: Mihomo / VoHive / Clash  
Deployment / 部署: Docker multi-stage build  

---

## 🐳 Supported Platforms / 支持平台

Linux 🐧  
NAS 📦  
OpenWrt 📡  
ARM devices ⚡  
x86 servers 🖥  
HomeLab / Edge nodes 💀  

---

## ⚠️ Notes / 注意事项

🚫 Do NOT expose to public internet without protection  
🚫 不建议直接暴露公网

⚙️ Mihomo / VoHive must be configured manually  
⚙️ Mihomo / VoHive 需手动配置

🧠 If something breaks, it is usually networking related  
🧠 出问题通常是网络配置问题

---

## 📦 Port / 端口

8866

---

## 🧃 Status / 状态

✔ Running / 运行中  
✔ Stable / 稳定  
✔ Production Ready / 可部署  
✔ Multi-platform / 多平台支持  

---

## 💀 Philosophy / 核心理念

You are not just using a dashboard.  
You are operating a control plane.

你不是在使用一个面板，而是在操作一个控制系统。

---

## 👨‍💻 Author / 作者

asrtroh-netizen  

📢 TG Group: https://t.me/OneBoardX

Built for fun → Became serious → Now it controls networks.



## 🙏 Acknowledgements / 致谢

OneBoard is built on top of several open-source ecosystems and infrastructure projects. We sincerely appreciate their contributions to modern networking, proxy, and device control systems.

🙏 Mihomo Project (MetaCubeX)  
https://github.com/MetaCubeX/mihomo  

🙏 Clash Core / OpenClash Ecosystem  
https://github.com/Dreamacro/clash  
https://github.com/vernesong/OpenClash  

🙏 VoHive Release & Distribution Repository  
https://github.com/iniwex5/vohive-release  

---

💡 These projects provide the foundational infrastructure layer for proxy systems, device management, and backend orchestration. OneBoard integrates and extends these capabilities into a unified visual control plane.

💡 这些项目构成了现代网络代理、设备管理与发布体系的基础层，OneBoard 在其之上实现统一可视化控制中枢。

---

⚡ Respect open source. Build on it. Contribute back.  
⚡ 尊重开源社区，在其之上构建，并回馈社区。
