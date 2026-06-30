#!/bin/sh
# OneBord OpenWrt Full Release installer
set -eu

INSTALL_DIR="${INSTALL_DIR:-/opt/onebord}"
ENV_DIR="${ENV_DIR:-/etc/onebord}"
MODE="${MODE:-auto}"

usage() {
  cat <<'EOF'
Usage:
  sh install.sh node [onebord-openwrt-node.tar.gz]
  sh install.sh binary [onebord-openwrt-amd64|arm64|armv7]
  sh install.sh auto

auto: prefer pkg binary in ./bin/, fallback to node tarball
EOF
}

detect_arch() {
  UNAME_M="$(uname -m)"
  case "$UNAME_M" in
    x86_64|amd64) echo amd64 ;;
    aarch64|arm64) echo arm64 ;;
    armv7*|armv6*) echo armv7 ;;
    *) echo "$UNAME_M" ;;
  esac
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
  mkdir -p "$INSTALL_DIR"
  tar -xzf "$ARCHIVE" -C "$INSTALL_DIR"
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

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root" >&2
  exit 1
fi

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

install_env_and_initd
/etc/init.d/onebord enable 2>/dev/null || true
/etc/init.d/onebord restart 2>/dev/null || /etc/init.d/onebord start

LAN_IP="$(uci get network.lan.ipaddr 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')"
echo "OneBord OpenWrt Full Release installed."
echo "Open UI: http://${LAN_IP:-<router-ip>}:${ONEBORD_PORT:-18080}"
