🚀 OneBoard

⚡ Glass-Engineered Multi-System Control Plane
⚡ 玻璃拟态多系统控制中枢

============================================================

📸 UI Preview / 实际界面展示
<img src="https://i.ibb.co/chDWGcxk/1.png" width="100%" />
<img src="https://i.ibb.co/DgVH9P22/2.png" width="100%" />
<img src="https://i.ibb.co/gbfF92V7/3.png" width="100%" />
<img src="https://i.ibb.co/YTQr7r0s/4.png" width="100%" />
<img src="https://i.ibb.co/8DLFJDXP/5.png" width="100%" />
<img src="https://i.ibb.co/qMh3j79D/6.png" width="100%" />
<img src="https://i.ibb.co/dswt1pgH/7.png" width="100%" />
<img src="https://i.ibb.co/n8ZSxcgn/8.png" width="100%" />

============================================================

🌍 Overview / 项目概述

那天晚上的一个情景再现。

你在 Vohive 切节点，又打开 ZashBoard 去改规则，再去 Mihomo / Clash 面板确认状态，最后还要进 YAML 手动补配置。

整个流程很熟悉，但也很割裂：

每个工具都能用
但没有一个是整体系统
状态不统一
操作不闭环
YAML 永远躲不掉

于是一个很直接的想法出现了：

既然这些系统都已经成熟，那为什么不能把它们统一成一个控制层？

不是再做一个面板，而是做一个真正的：

Multi-System Control Plane（多系统控制中枢）

OneBoard 就是在这种思路下诞生的——一个把 Mihomo / VoHive / OpenClash / Docker 统一到同一操作空间的控制平台。

============================================================

⚡ Core Features / 核心功能
Multi-backend orchestration (Mihomo / VoHive / Clash)
Real-time traffic & device monitoring
SIM / eSIM lifecycle control
Messaging center integration (SMS)
Smart proxy routing engine
Glass UI (light & dark mode)
Docker multi-architecture deployment
ARM / x86 / NAS / OpenWrt support
Auto backend switching (no stale state)

============================================================

🚀 Quick Start
docker pull ghcr.io/asrtroh-netizen/oneboard:latest
docker run -d --name oneboard --restart unless-stopped -p 8866:8866 ghcr.io/asrtroh-netizen/oneboard:latest

============================================================

🌐 Access
http://localhost:8866
http://YOUR-IP:8866

============================================================

🔐 Default Login

Username: admin
Password: admin

============================================================

🧱 Architecture
Frontend: Vue 3 + Vite
Backend: Node.js Gateway
Adapters: Mihomo / VoHive / Clash
Deployment: Docker multi-stage build

============================================================

🐳 Supported Platforms
Linux
NAS
OpenWrt
ARM
x86
HomeLab

============================================================

⚠️ Notes
不建议直接暴露公网
Mihomo / VoHive 需手动配置
网络问题优先检查 DNS / 路由

============================================================

📦 Port
8866

============================================================

💀 Philosophy

You are not just using a dashboard. You are operating a control plane.
你不是在使用一个面板，你是在操作一个系统级控制中枢。

============================================================

🧃 Status
Running
Stable
Production Ready
Multi-platform

============================================================

👨‍💻 Author

asrtroh-netizen
Built for fun → Became serious → Now it controls networks.
TG: https://t.me/OneBoardX

============================================================

🙏 Acknowledgements
Mihomo: https://github.com/MetaCubeX/mihomo
Clash / OpenClash: https://github.com/Dreamacro/clash
VoHive: https://github.com/iniwex5/vohive-release

============================================================

💰 Donation

一杯咖啡 = 一个更稳定的 OneBoard

<img src="https://i.ibb.co/b50Q1Sv9/40f3af89d821a4b97090c8876ef2fc9d.jpg" width="100%" />

============================================================

💀 End

OneBoard = Control the Invisible

============================================================
