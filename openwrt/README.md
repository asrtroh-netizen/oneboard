# OneBord OpenWrt Full Release

OpenWrt 完整独立控制台：Web UI + onebord-agent + HTTP API + WebSocket + 静态资源 + 宿主机采集 + Mihomo/VoHive 对接。

浏览器访问：`http://<OpenWrt-IP>:18080`

## 产物结构

```
release/openwrt/
  bin/
    onebord-openwrt-amd64
    onebord-openwrt-arm64
    onebord-openwrt-armv7
    BUILD_NOTES.txt
  data/dist/                 # pkg 二进制安装时复制到 /opt/onebord/dist
  init.d/onebord
  env/onebord.env.example
  onebord-openwrt-node.tar.gz
  install.sh
  README.md
```

## 构建（开发机）

```bash
npm install
npm run build:openwrt
```

`pkg` 在 Windows/macOS 上交叉编译 Linux 二进制可能失败，详见 `bin/BUILD_NOTES.txt`。失败时使用 `onebord-openwrt-node.tar.gz` + 路由器上的 `node`。

## 方式 A：pkg 二进制（推荐，若构建成功）

```bash
# 复制整个 release/openwrt/ 到路由器 /tmp/onebord/
cd /tmp/onebord
chmod +x install.sh
sh install.sh binary amd64   # 或 arm64 / armv7
```

或手动：

```bash
scp release/openwrt/bin/onebord-openwrt-amd64 root@OpenWrt-IP:/usr/bin/onebord
scp -r release/openwrt/data/dist root@OpenWrt-IP:/opt/onebord/
ssh root@OpenWrt-IP
chmod +x /usr/bin/onebord
ONEBORD_RUNTIME=openwrt \
ONEBORD_PORT=18080 \
ONEBORD_APP_ROOT=/opt/onebord \
ONEBORD_DIST_DIR=/opt/onebord/dist \
ONEBORD_MIHOMO_UPSTREAM=http://127.0.0.1:9090 \
ONEBORD_VOHIVE_UPSTREAM=http://127.0.0.1:7575 \
/usr/bin/onebord
```

## 方式 B：Node 完整包（通用）

```bash
opkg update && opkg install node
cd /tmp/onebord
sh install.sh node onebord-openwrt-node.tar.gz
```

## 服务化

```bash
scp release/openwrt/init.d/onebord root@OpenWrt-IP:/etc/init.d/onebord
scp release/openwrt/env/onebord.env.example root@OpenWrt-IP:/etc/onebord/onebord.env
ssh root@OpenWrt-IP
chmod +x /etc/init.d/onebord
/etc/init.d/onebord enable
/etc/init.d/onebord start
/etc/init.d/onebord status
/etc/init.d/onebord restart
/etc/init.d/onebord stop
```

## API 验证

```bash
curl http://127.0.0.1:18080/api/health
curl http://127.0.0.1:18080/api/control-plane/snapshot
```

WebSocket：`ws://<OpenWrt-IP>:18080/api/control-plane/ws`

## 默认环境变量

```bash
ONEBORD_RUNTIME=openwrt
ONEBORD_PORT=18080
ONEBORD_MIHOMO_UPSTREAM=http://127.0.0.1:9090
ONEBORD_VOHIVE_UPSTREAM=http://127.0.0.1:7575
ONEBORD_APP_ROOT=/opt/onebord
ONEBORD_DIST_DIR=/opt/onebord/dist
```

## 与 Docker Full Release 对比

| 项目 | Docker / NAS | OpenWrt |
|------|----------------|---------|
| 入口 | `npm start` / 容器 CMD | `/usr/bin/onebord` 或 node 启动器 |
| 默认端口 | 3000 | 18080 |
| UI | 同源 `dist/` | 同源 `dist/` |
| API schema | 相同 | 相同 |
| 依赖 Docker UI | 否 | 否 |

两台机器可分别独立测试。
