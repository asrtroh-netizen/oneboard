rules:
# ===基础修复（Nikki/redirect 常见问题）===
#== 禁止 QUIC（UDP 443），减少抖音/小红书等偶发转圈==
- AND,((NETWORK,UDP),(DST-PORT,443)),REJECT
# ==抖音 / 小红书：强制直连兜底（不影响 TikTok）==
- DOMAIN-SUFFIX,douyin.com,DIRECT
- DOMAIN-SUFFIX,iesdouyin.com,DIRECT
- DOMAIN-SUFFIX,snssdk.com,DIRECT
- DOMAIN-SUFFIX,amemv.com,DIRECT
- DOMAIN-SUFFIX,byteimg.com,DIRECT
- DOMAIN-SUFFIX,ixigua.com,DIRECT
- DOMAIN-SUFFIX,xiaohongshu.com,DIRECT
- DOMAIN-SUFFIX,xhscdn.com,DIRECT
- DOMAIN-SUFFIX,xhscdn.net,DIRECT


# === Apple AI/News 分流 ===
- RULE-SET,AppleAI_No_Resolve,🍎 Apple Pro
- RULE-SET,AppleAI_Domain,🍎 Apple Pro
- RULE-SET,AppleAI,🍎 Apple Pro
- RULE-SET,AppleNews_No_Resolve,🍎 Apple Pro
- RULE-SET,AppleNews,🍎 Apple Pro
- RULE-SET,AppleNews_Domain,🍎 Apple Pro
- RULE-SET,AppleNews_IP,🍎 Apple Pro

# === Bank/ WiFi Calling === 

# ==HK==
#Hong Kong（VoWiFi / ePDG）
- DOMAIN-SUFFIX,csl.prod.ondemandconnectivity.com,📱 HK-WIFI
- DOMAIN-SUFFIX,device.three.com.hk,📱 HK-WIFI
- DOMAIN-SUFFIX,epdg.epc.mnc000.mcc454.pub.3gppnetwork.org,📱 HK-WIFI
- DOMAIN-SUFFIX,hhk.prod.ondemandconnectivity.com,📱 HK-WIFI
- DOMAIN-SUFFIX,ss.epdg.epc.geo.mnc000.mcc454.pub.3gppnetwork.org,📱 HK-WIFI
- DOMAIN-SUFFIX,ss.epdg.epc.mnc000.mcc454.pub.3gppnetwork.org,📱 HK-WIFI
- DOMAIN-SUFFIX,wlan.three.com.hk,📱 HK-WIFI
- DOMAIN-SUFFIX,epdg.epc.mnc007.mcc454.pub.3gppnetwork.org,📱 HK-WIFI

- IP-CIDR,120.88.224.0/24,📱 HK-WIFI,no-resolve
- IP-CIDR,120.88.240.0/24,📱 HK-WIFI,no-resolve
- IP-CIDR,124.217.186.0/24,📱 HK-WIFI,no-resolve
- IP-CIDR,203.145.92.0/24,📱 HK-WIFI,no-resolve
- IP-CIDR,4.209.41.0/24,📱 HK-WIFI,no-resolve
#  Finance / Banking / Payments
- DOMAIN-SUFFIX,hsbc.com.hk,📱 HK-WIFI
- DOMAIN-SUFFIX,hangseng.com,📱 HK-WIFI
- DOMAIN-SUFFIX,bochk.com,📱 HK-WIFI
- DOMAIN-SUFFIX,hkbea.com,📱 HK-WIFI
- DOMAIN-SUFFIX,sc.com,📱 HK-WIFI
- DOMAIN-SUFFIX,citibank.com.hk,📱 HK-WIFI
- DOMAIN-SUFFIX,dbs.com.hk,📱 HK-WIFI
- DOMAIN-SUFFIX,icbcasia.com,📱 HK-WIFI
- DOMAIN-SUFFIX,asia.ccb.com,📱 HK-WIFI
- DOMAIN-SUFFIX,online.asia.ccb.com,📱 HK-WIFI
- DOMAIN-SUFFIX,ocbc.com.hk,📱 HK-WIFI
- DOMAIN-SUFFIX,dahsing.com,📱 HK-WIFI
- DOMAIN-SUFFIX,bank.za.group,📱 HK-WIFI
- DOMAIN-SUFFIX,za.group,📱 HK-WIFI
- DOMAIN-SUFFIX,welab.bank,📱 HK-WIFI
- DOMAIN-SUFFIX,fusionbank.com,📱 HK-WIFI
- DOMAIN-SUFFIX,mox.com,📱 HK-WIFI

# ==UK==
# 📱 UK-WIFI — United Kingdom（VoWiFi / ePDG）
- DOMAIN-SUFFIX,entsrv-uk.vodafone.com,📱 UK-WIFI
- DOMAIN-SUFFIX,epdg.epc.mnc001.mcc230.pub.3gppnetwork.org,📱 UK-WIFI
- DOMAIN-SUFFIX,epdg.epc.mnc010.mcc234.pub.3gppnetwork.org,📱 UK-WIFI
- DOMAIN-SUFFIX,epdg.epc.mnc015.mcc234.pub.3gppnetwork.org,📱 UK-WIFI
- DOMAIN-SUFFIX,giffgaff.com,📱 UK-WIFI
- DOMAIN-SUFFIX,ss.epdg.epc.geo.mnc015.mcc234.pub.3gppnetwork.org,📱 UK-WIFI
- DOMAIN-SUFFIX,ss.epdg.epc.mnc015.mcc234.pub.3gppnetwork.org,📱 UK-WIFI
- DOMAIN-SUFFIX,voxi.co.uk,📱 UK-WIFI
- DOMAIN-SUFFIX,vuk-gto.prod.ondemandconnectivity.com,📱 UK-WIFI
- IP-CIDR,148.252.160.0/24,📱 UK-WIFI,no-resolve
- IP-CIDR,148.252.188.0/24,📱 UK-WIFI,no-resolve
- IP-CIDR,185.153.236.0/24,📱 UK-WIFI,no-resolve
- IP-CIDR,185.153.237.0/24,📱 UK-WIFI,no-resolve
- IP-CIDR,46.68.0.0/17,📱 UK-WIFI,no-resolve
- IP-CIDR,46.68.57.0/24,📱 UK-WIFI,no-resolve
- IP-CIDR,46.68.58.0/24,📱 UK-WIFI,no-resolve
- IP-CIDR,46.68.59.0/24,📱 UK-WIFI,no-resolve
- IP-CIDR,62.141.11.56/24,📱 UK-WIFI,no-resolve
- IP-CIDR,87.194.0.0/24,📱 UK-WIFI,no-resolve
- IP-CIDR,87.194.8.0/24,📱 UK-WIFI,no-resolve
- IP-CIDR,87.194.88.0/24,📱 UK-WIFI,no-resolve
- IP-CIDR,88.82.0.0/24,📱 UK-WIFI,no-resolve
- IP-CIDR,88.82.11.0/24,📱 UK-WIFI,no-resolve


# ==DE==
# 📱 DE-WIFI — Germany（VoWiFi / IMS / ePDG）
# Deutsche Telekom / Telekom Germany — MCC 262 MNC 01
- DOMAIN-SUFFIX,epdg.epc.mnc001.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,ss.epdg.epc.mnc001.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,sos.epdg.epc.mnc001.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN,ims.mnc001.mcc262.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,telekom.de,📱 DE-WIFI
- DOMAIN-SUFFIX,t-mobile.de,📱 DE-WIFI

# Vodafone Germany — MCC 262 MNC 02 / 09
- DOMAIN-SUFFIX,epdg.epc.mnc002.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,ss.epdg.epc.mnc002.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,sos.epdg.epc.mnc002.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN,ims.mnc002.mcc262.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,epdg.epc.mnc009.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,ss.epdg.epc.mnc009.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,sos.epdg.epc.mnc009.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN,ims.mnc009.mcc262.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,epdg.epc.drz1.vodafone-ip.de,📱 DE-WIFI
- DOMAIN-SUFFIX,vodafone-dns.net,📱 DE-WIFI
- DOMAIN-SUFFIX,vodafone-ip.de,📱 DE-WIFI
- DOMAIN-SUFFIX,vodafone.de,📱 DE-WIFI
- DOMAIN-SUFFIX,arcor-ip.de,📱 DE-WIFI

# Telefonica / O2 Germany — MCC 262 MNC 03 / 07
- DOMAIN-SUFFIX,epdg.epc.mnc003.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,ss.epdg.epc.mnc003.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,sos.epdg.epc.mnc003.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN,ims.mnc003.mcc262.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,epdg.epc.mnc007.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,ss.epdg.epc.mnc007.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,sos.epdg.epc.mnc007.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN,ims.mnc007.mcc262.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,o2online.de,📱 DE-WIFI
- DOMAIN-SUFFIX,telefonica.de,📱 DE-WIFI
- DOMAIN-SUFFIX,eplus.de,📱 DE-WIFI

# 1&1 / other German mobile gateway records
- DOMAIN-SUFFIX,epdg.epc.mnc023.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,ss.epdg.epc.mnc023.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,sos.epdg.epc.mnc023.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN,ims.mnc023.mcc262.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,1und1.de,📱 DE-WIFI
- DOMAIN-SUFFIX,1u1.de,📱 DE-WIFI
- DOMAIN-SUFFIX,epdg.epc.mnc014.mcc262.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,epdg.epc.mnc020.mcc262.pub.3gppnetwork.org,📱 DE-WIFI

# Generic Germany visited-country ePDG
- DOMAIN-SUFFIX,epdg.epc.mcc262.visited-country.pub.3gppnetwork.org,📱 DE-WIFI
- DOMAIN-SUFFIX,sos.epdg.epc.mcc262.visited-country.pub.3gppnetwork.org,📱 DE-WIFI

# Banking / existing Germany-related domains
- DOMAIN-SUFFIX,n26.com,📱 DE-WIFI
- DOMAIN-SUFFIX,support.n26.com,📱 DE-WIFI
- DOMAIN-SUFFIX,tech26.de,📱 DE-WIFI

# ==USA==
# USA CALL — Carriers VoWiFi (Force 📱 US-WIFI)

# AT&T (VoWiFi)
# Ports (FYI): UDP 500 / UDP 4500 / TCP 143
- DOMAIN,epdg.epc.att.net,📱 US-WIFI
- DOMAIN,sentitlement2.mobile.att.net,📱 US-WIFI
- DOMAIN,vvm.mobile.att.net,📱 US-WIFI
- DOMAIN,mmsc.mobile.att.net,📱 US-WIFI
# AT&T CIDR fallback (经验兜底，不是官方清单)
- IP-CIDR,107.64.0.0/10,📱 US-WIFI,no-resolve
- IP-CIDR,129.192.0.0/16,📱 US-WIFI,no-resolve
- IP-CIDR,166.128.0.0/9,📱 US-WIFI,no-resolve

# Verizon (VoWiFi)
# Ports (FYI): UDP 500 / UDP 4500
- DOMAIN,wo.vzwwo.com,📱 US-WIFI
- DOMAIN,sg.vzwfemto.com,📱 US-WIFI
# Optional (如果日志里见到再开)
- DOMAIN,sgw.vzwfemto.com,📱 US-WIFI
# Verizon CIDR fallback (经验兜底，不是官方清单)
- IP-CIDR,141.207.0.0/16,📱 US-WIFI,no-resolve
- IP-CIDR,162.115.0.0/16,📱 US-WIFI,no-resolve

# T-Mobile (VoWiFi)
- DOMAIN,crl.t-mobile.com,📱 US-WIFI
- DOMAIN,eas3.msg.t-mobile.com,📱 US-WIFI
- DOMAIN-SUFFIX,msg.t-mobile.com,📱 US-WIFI
- DOMAIN-SUFFIX,sipgeo.t-mobile.com,📱 US-WIFI
- DOMAIN,epdg.epc.mnc260.mcc310.pub.3gppnetwork.org,📱 US-WIFI
- DOMAIN,ss.epdg.epc.mnc260.mcc310.pub.3gppnetwork.org,📱 US-WIFI
- DOMAIN,ss.epdg.epc.geo.mnc260.mcc310.pub.3gppnetwork.org,📱 US-WIFI
- IP-CIDR,66.94.0.0/19,📱 US-WIFI,no-resolve
- IP-CIDR,208.54.0.0/16,📱 US-WIFI,no-resolve
- IP-CIDR,206.29.177.36/32,📱 US-WIFI,no-resolve

# USA CALL  NVMO 
- DOMAIN-SUFFIX,inner-active.mobi,📱 US-WIFI
- DOMAIN-SUFFIX,mobilefuse.com,📱 US-WIFI
- DOMAIN-SUFFIX,inmobi.com,📱 US-WIFI
- DOMAIN-SUFFIX,crashlytics.com,📱 US-WIFI
- DOMAIN-SUFFIX,talkatone.com,📱 US-WIFI
- DOMAIN-SUFFIX,kochava.com,📱 US-WIFI
- DOMAIN-SUFFIX,cohere.com,📱 US-WIFI
- DOMAIN-SUFFIX,agkn.com,📱 US-WIFI
- DOMAIN-SUFFIX,tktn.at,📱 US-WIFI
- DOMAIN-SUFFIX,tktn.be,📱 US-WIFI

- IP-CIDR,50.117.27.0/24,📱 US-WIFI
- IP-CIDR,69.46.75.0/24,📱 US-WIFI
- IP-CIDR,205.164.56.0/24,📱 US-WIFI
- IP-CIDR,63.251.124.0/24,📱 US-WIFI
# USA（BANK）Finance / Banking / Payments 
- DOMAIN-SUFFIX,chase.com,📱 US-WIFI
- DOMAIN-SUFFIX,bankofamerica.com,📱 US-WIFI
- DOMAIN-SUFFIX,wellsfargo.com,📱 US-WIFI
- DOMAIN-SUFFIX,usbank.com,📱 US-WIFI
- DOMAIN-SUFFIX,capitalone.com,📱 US-WIFI
- DOMAIN-SUFFIX,pnc.com,📱 US-WIFI
- DOMAIN-SUFFIX,truist.com,📱 US-WIFI
- DOMAIN-SUFFIX,usaa.com,📱 US-WIFI
- DOMAIN-SUFFIX,navyfederal.org,📱 US-WIFI
- DOMAIN-SUFFIX,citibank.com,📱 US-WIFI
- DOMAIN-SUFFIX,citi.com,📱 US-WIFI
- DOMAIN-SUFFIX,americanexpress.com,📱 US-WIFI
- DOMAIN-SUFFIX,amex.com,📱 US-WIFI
- DOMAIN-SUFFIX,aexp.com,📱 US-WIFI
- DOMAIN-SUFFIX,amextravel.com,📱 US-WIFI
- DOMAIN-SUFFIX,venmo.com,📱 US-WIFI
- DOMAIN-SUFFIX,cash.app,📱 US-WIFI
- DOMAIN-SUFFIX,revolut.com,📱 US-WIFI
# ==直连类 ==
- DOMAIN-SUFFIX,epdg.epc.mnc260.mcc310.pub.3gppnetwork.org,📱 DR-WIFI
- DOMAIN-SUFFIX,sos.epdg.epc.mnc260.mcc310.pub.3gppnetwork.org,📱 DR-WIFI
- DOMAIN-SUFFIX,epdg.epc.mcc310.visited-country.pub.3gppnetwork.org,📱 DR-WIFI
- DOMAIN-SUFFIX,sos.epdg.epc.mcc310.visited-country.pub.3gppnetwork.org,📱 DR-WIFI
- DOMAIN-SUFFIX,ss.epdg.epc.mnc260.mcc310.pub.3gppnetwork.org,📱 DR-WIFI
- DOMAIN-SUFFIX,epdg.epc.att.net,📱 DR-WIFI
- DOMAIN-SUFFIX,epdg.epc.att-idns.net,📱 DR-WIFI
- IP-CIDR,107.122.31.0/24,📱 DR-WIFI,no-resolve
# 泰国 AIS（MCC 520 / MNC 003）
- DOMAIN-SUFFIX,epdg.epc.mnc003.mcc520.pub.3gppnetwork.org,📱 DR-WIFI
- DOMAIN-SUFFIX,sos.epdg.epc.mnc003.mcc520.pub.3gppnetwork.org,📱 DR-WIFI
- DOMAIN-SUFFIX,epdg.epc.mcc520.visited-country.pub.3gppnetwork.org,📱 DR-WIFI
- DOMAIN-SUFFIX,sos.epdg.epc.mcc520.visited-country.pub.3gppnetwork.org,📱 DR-WIFI
- DOMAIN-SUFFIX,ss.epdg.epc.mnc003.mcc520.pub.3gppnetwork.org,📱 DR-WIFI
# ==其他类== 
- DOMAIN-SUFFIX,pub.3gppnetwork.org,📱 Bk-WIFI
- DOMAIN-SUFFIX,3gppnetwork.org,📱 Bk-WIFI
# ===blackmatrix7 引用规则分流 (核心优化部分) ===
  # 隐私与拦截类 (必须放最前面，强力阻断) ---
- RULE-SET,Advertising,🛑 广告拦截
- RULE-SET,Privacy,🛑 广告拦截
- RULE-SET,Hijacking,🛑 广告拦截
# ===== China Direct (GEOSITE/GEOIP) =====
- GEOSITE,CN,DIRECT

# ===杂项修改===
# ==订阅更新==
- DOMAIN,zhuzhuzhu.whtjdasha.com,🎯 全球直连
- IP-CIDR,119.29.57.170/32,🎯 全球直连,no-resolve
- DOMAIN,dy.sbyun.org,🎯 全球直连
- DOMAIN,em.mesl.cloud,🎯 全球直连
- IP-CIDR,23.158.136.41/32,🎯 全球直连,no-resolve
  # 丫头的电影
- DOMAIN-SUFFIX,flowus.cn,DIRECT
- DOMAIN-SUFFIX,shimo.im,DIRECT
- DOMAIN-SUFFIX,wuguimovie.com,📽 Emby

  #==Speedtest (测速节点分流) ==
- RULE-SET,Speedtest,🚀 节点选择

  # ==AI 大模型类 ---
- RULE-SET,OpenAI,💬 Ai平台
- RULE-SET,Claude,💬 Ai平台
- RULE-SET,Gemini,💬 Ai平台

  # ==专属流媒体与搜索 (完美对应你的专属策略组)==
- RULE-SET,Google,🐻 GOOGLE
- RULE-SET,YouTube,📹 油管视频
- RULE-SET,Netflix,🎥 奈飞视频

  # == 2. Tk 和 电报==
- RULE-SET,TikTok,📲 电报消息
- RULE-SET,Telegram,📲 电报消息

  # ==科技大厂 & 社交平台==
- RULE-SET,Twitter,🌍 国外媒体
- RULE-SET,Meta,🌍 国外媒体
- RULE-SET,Apple,🍎 苹果服务
- RULE-SET,Microsoft,🎯 全球直连
  # ==BT 进程防漏流 (原文件末尾的心血，务必保留) ==
- PROCESS-NAME,aria2c.exe,🎯 全球直连
- PROCESS-NAME,fdm.exe,🎯 全球直连
- PROCESS-NAME,Thunder.exe,🎯 全球直连
- PROCESS-NAME,Transmission.exe,🎯 全球直连
- PROCESS-NAME,uTorrent.exe,🎯 全球直连
- PROCESS-NAME,qbittorrent.exe,🎯 全球直连
- PROCESS-NAME,BitComet.exe,🎯 全球直连

  
  # ===加速===
  # ==GitHub 加速==
- DOMAIN-SUFFIX,github.com,🚀 节点选择
  # GitHub API（很多工具会用）
- DOMAIN-SUFFIX,api.github.com,🚀 节点选择
  # GitHub Raw 文件下载
- DOMAIN-SUFFIX,raw.githubusercontent.com,🚀 节点选择
  # GitHub Release 下载 CDN
- DOMAIN-SUFFIX,objects.githubusercontent.com,🚀 节点选择
  # GitHub 代码下载
- DOMAIN-SUFFIX,codeload.github.com,🚀 节点选择
  # GitHub 静态资源
- DOMAIN-SUFFIX,githubassets.com,🚀 节点选择
  # GitHub 用户内容
- DOMAIN-SUFFIX,githubusercontent.com,🚀 节点选择

  # ==Docker 加速==
  # Docker Hub
- DOMAIN-SUFFIX,docker.com,🚀 节点选择
  # Docker 镜像下载
- DOMAIN-SUFFIX,docker.io,🚀 节点选择
  # Docker Registry
- DOMAIN-SUFFIX,registry-1.docker.io,🚀 节点选择
  # Docker CDN
- DOMAIN-SUFFIX,cloudflare.docker.com,🚀 节点选择

  # ==Cloudflare 服务==

  # Cloudflare 网站服务
- DOMAIN-SUFFIX,cloudflare.com,🚀 节点选择

  # Cloudflare CDN
- DOMAIN-SUFFIX,cloudflare.net,🚀 节点选择

  # Cloudflare Workers
- DOMAIN-SUFFIX,workers.dev,🚀 节点选择


  #==游戏平台类 (完美映射你的 🎮 游戏平台) ==
- RULE-SET,Steam,🎮 游戏平台
- RULE-SET,EA,🎮 游戏平台
- RULE-SET,Epic,🎮 游戏平台
- RULE-SET,Nintendo,🎮 游戏平台

  # ==兜底==
- RULE-SET,Proxy,🚀 节点选择
 - RULE-SET,Direct,🎯 全球直连
- RULE-SET,ChinaMax,🎯 全球直连
- GEOIP,LAN,DIRECT
- GEOIP,CN,🎯 全球直连
- MATCH,🐟 漏网之鱼
