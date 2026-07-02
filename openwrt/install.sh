#!/bin/sh
# OneBord OpenWrt Full Release installer
#
# 本地模式（解压 release 包后在包目录内执行）：
#   sh install.sh auto|node|binary
# 远程模式（无需预先下载 release 包，直接从 GitHub Releases 拉取）：
#   sh install.sh remote [version]   # version 形如 v1.1，缺省用 latest
set -eu

INSTALL_DIR="${INSTALL_DIR:-/opt/onebord}"
ENV_DIR="${ENV_DIR:-/etc/onebord}"
MODE="${MODE:-auto}"
REPO="${ONEBORD_REPO:-asrtroh-netizen/oneboard}"

usage() {
  cat <<'EOF'
Usage:
  sh install.sh auto                      # prefer pkg binary in ./bin/, fallback to node tarball
  sh install.sh node [node.tar.gz]        # force Node runtime mode (needs: opkg install node)
  sh install.sh binary [amd64|arm64|armv7]# force pkg binary mode
  sh install.sh remote [vX.Y]             # download from GitHub Releases (default: latest)

Env overrides: INSTALL_DIR / ENV_DIR / ONEBORD_REPO
EOF
}

# 归一化 CPU 架构：能匹配 pkg 预编译产物的返回产物名，其余原样返回
detect_arch() {
  UNAME_M="$(uname -m)"
  case "$UNAME_M" in
    x86_64|amd64) echo amd64 ;;
    aarch64|arm64) echo arm64 ;;
    armv7*|armv6*) echo armv7 ;;
    *) echo "$UNAME_M" ;;
  esac
}

# BusyBox 环境优先 wget（OpenWrt 自带），无则退 curl
fetch() {
  URL="$1"
  OUT="$2"
  if command -v wget >/dev/null 2>&1; then
    wget -q -O "$OUT" "$URL"
  elif command -v curl >/dev/null 2>&1; then
    curl -fsSL -o "$OUT" "$URL"
  else
    echo "Need wget or curl for remote install" >&2
    return 1
  fi
}

install_env_and_initd() {
  mkdir -p "$ENV_DIR"
  if [ -f env/onebord.env.example ] && [ ! -f "$ENV_DIR/onebord.env" ]; then
    cp env/onebord.env.example "$ENV_DIR/onebord.env"
  elif [ -f onebord.env.example ] && [ ! -f "$ENV_DIR/onebord.env" ]; then
    cp onebord.env.example "$ENV_DIR/onebord.env"
  fi

  if [ -f init.d/onebord ]; then
    cp init.d/onebord /etc/init.d/onebord
    chmod +x /etc/init.d/onebord
  fi
}

install_data_dist() {
  mkdir -p "$INSTALL_DIR"
  if [ -d data/dist ]; then
    rm -rf "$INSTALL_DIR/dist"
    cp -a data/dist "$INSTALL_DIR/dist"
  fi
}

install_node_tarball() {
  ARCHIVE="${1:-onebord-openwrt-node.tar.gz}"
  if [ ! -f "$ARCHIVE" ]; then
    echo "Archive not found: $ARCHIVE" >&2
    exit 1
  fi
  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js required: opkg update && opkg install node" >&2
    exit 1
  fi
  # 包内顶层固定为 onebord/：先解到临时目录再合并进安装目录，
  # 修复旧版直接解压产生 /opt/onebord/onebord 双层嵌套的问题；
  # 用 cp 合并（而非 rm 整目录）以保住升级场景下的 .onebord 用户数据
  EXTRACT_DIR="$(mktemp -d /tmp/onebord-extract.XXXXXX)"
  tar -xzf "$ARCHIVE" -C "$EXTRACT_DIR"
  mkdir -p "$INSTALL_DIR"
  cp -a "$EXTRACT_DIR/onebord/." "$INSTALL_DIR/"
  rm -rf "$EXTRACT_DIR"
  chmod +x "$INSTALL_DIR/bin/onebord-agent" 2>/dev/null || true
}

install_pkg_binary() {
  ARCH="${1:-$(detect_arch)}"
  BIN="bin/onebord-openwrt-${ARCH}"
  if [ ! -f "$BIN" ]; then
    echo "Binary not found: $BIN" >&2
    exit 1
  fi
  install_data_dist
  cp "$BIN" /usr/bin/onebord
  chmod +x /usr/bin/onebord
}

# 对照 Release 附带的 SHA256SUMS 校验下载完整性；
# 环境缺 sha256sum 或清单无该项时跳过（尽力而为，不阻断低配设备）
verify_sum() {
  FILE="$1"
  NAME="$(basename "$FILE")"
  [ -f SHA256SUMS ] || return 0
  command -v sha256sum >/dev/null 2>&1 || { echo "sha256sum not found, skip verify: $NAME"; return 0; }
  WANT="$(grep "  ${NAME}\$" SHA256SUMS | awk '{print $1}')"
  [ -n "$WANT" ] || return 0
  GOT="$(sha256sum "$FILE" | awk '{print $1}')"
  if [ "$WANT" != "$GOT" ]; then
    echo "Checksum mismatch: $NAME (expected $WANT, got $GOT)" >&2
    exit 1
  fi
  echo "checksum ok: $NAME"
}

# 远程安装：按架构自动选择二进制或 Node 通用包。
# MIPS 等无预编译二进制的架构自动落到 Node 模式（需 opkg node）。
install_remote() {
  VERSION="${1:-latest}"
  if [ "$VERSION" = "latest" ]; then
    BASE="https://github.com/$REPO/releases/latest/download"
  else
    BASE="https://github.com/$REPO/releases/download/$VERSION"
  fi

  WORK="$(mktemp -d /tmp/onebord-install.XXXXXX)"
  trap 'rm -rf "$WORK"' EXIT
  cd "$WORK"

  fetch "$BASE/SHA256SUMS" SHA256SUMS 2>/dev/null || echo "SHA256SUMS unavailable, skip integrity check"

  echo "Fetching support bundle from $BASE ..."
  fetch "$BASE/onebord-openwrt-support.tar.gz" onebord-openwrt-support.tar.gz
  verify_sum onebord-openwrt-support.tar.gz
  tar -xzf onebord-openwrt-support.tar.gz

  ARCH="$(detect_arch)"
  case "$ARCH" in
    amd64|arm64|armv7)
      echo "Arch $ARCH: trying prebuilt binary ..."
      mkdir -p bin
      if fetch "$BASE/onebord-openwrt-$ARCH" "bin/onebord-openwrt-$ARCH" 2>/dev/null \
        && [ -s "bin/onebord-openwrt-$ARCH" ]; then
        verify_sum "bin/onebord-openwrt-$ARCH"
        fetch "$BASE/onebord-openwrt-webui.tar.gz" onebord-openwrt-webui.tar.gz
        verify_sum onebord-openwrt-webui.tar.gz
        tar -xzf onebord-openwrt-webui.tar.gz # 解出 data/dist（二进制模式的前端静态资源）
        install_pkg_binary "$ARCH"
      else
        echo "No prebuilt binary for $ARCH in this release, falling back to Node bundle ..."
        echo "Make sure Node.js is available: opkg update && opkg install node"
        fetch "$BASE/onebord-openwrt-node.tar.gz" onebord-openwrt-node.tar.gz
        verify_sum onebord-openwrt-node.tar.gz
        install_node_tarball onebord-openwrt-node.tar.gz
      fi
      ;;
    *)
      # MIPS 等路由器架构无 pkg 预编译产物，走通用 Node 包
      echo "Arch $ARCH has no prebuilt binary (e.g. MIPS routers), using Node bundle."
      echo "Make sure Node.js is available: opkg update && opkg install node"
      fetch "$BASE/onebord-openwrt-node.tar.gz" onebord-openwrt-node.tar.gz
      verify_sum onebord-openwrt-node.tar.gz
      install_node_tarball onebord-openwrt-node.tar.gz
      ;;
  esac

  install_env_and_initd
}

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root" >&2
  exit 1
fi

REMOTE_DONE=0
case "${1:-$MODE}" in
  -h|--help|help)
    usage
    exit 0
    ;;
  node)
    install_node_tarball "${2:-onebord-openwrt-node.tar.gz}"
    ;;
  binary)
    install_pkg_binary "${2:-$(detect_arch)}"
    ;;
  remote)
    install_remote "${2:-latest}"
    REMOTE_DONE=1
    ;;
  auto)
    ARCH="$(detect_arch)"
    if [ -f "bin/onebord-openwrt-${ARCH}" ]; then
      install_pkg_binary "$ARCH"
    else
      install_node_tarball "onebord-openwrt-node.tar.gz"
    fi
    ;;
  *)
    usage
    exit 1
    ;;
esac

# 远程模式内部已装好 env/init.d（工作目录不同），本地模式在此统一收尾
[ "$REMOTE_DONE" = "1" ] || install_env_and_initd
/etc/init.d/onebord enable 2>/dev/null || true
/etc/init.d/onebord restart 2>/dev/null || /etc/init.d/onebord start

LAN_IP="$(uci get network.lan.ipaddr 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')"
echo "OneBord OpenWrt Full Release installed."
echo "Open UI: http://${LAN_IP:-<router-ip>}:${ONEBORD_PORT:-18080}"
