#!/bin/bash
# device-ui 服务管理脚本
# 用法: ./01-operation/device-ui-operate.sh {start|stop|restart|status|log}
# 在 RK3588 上使用: cd /root/ui && bash 01-operation/device-ui-operate.sh start

set -e

PORT=8080
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="$PROJECT_DIR/server.cjs"
CHROMIUM_LOG="/tmp/chromium-ui.log"
SERVER_LOG="/tmp/device-ui.log"
PID_FILE="/tmp/device-ui.pid"

# ── 颜色 ──────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[device-ui]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[device-ui]${NC} $1"; }
log_error() { echo -e "${RED}[device-ui]${NC} $1"; }

# ── 停止服务 ──────────────────────────────────────
do_stop() {
    log_info "正在停止..."

    # 1. 杀掉 Chromium kiosk
    if pgrep -f "chromium.*kiosk" > /dev/null 2>&1; then
        kill $(pgrep -f "chromium.*kiosk") 2>/dev/null || true
        sleep 1
        # 强制杀掉残留
        pkill -9 -f "chromium.*kiosk" 2>/dev/null || true
        log_info "Chromium kiosk 已停止"
    else
        log_info "Chromium kiosk 未运行"
    fi

    # 2. 杀掉 node server
    if [ -f "$PID_FILE" ]; then
        kill $(cat "$PID_FILE") 2>/dev/null || true
        rm -f "$PID_FILE"
    fi
    # 杀掉所有占用 8080 端口的进程
    if lsof -ti:$PORT > /dev/null 2>&1; then
        kill $(lsof -ti:$PORT) 2>/dev/null || true
        sleep 1
        lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    fi
    pkill -f "node server.cjs" 2>/dev/null || true

    log_info "服务已停止"
}

# ── 启动服务 ──────────────────────────────────────
do_start() {
    do_stop
    sleep 1

    # 1. 启动 Node.js 后端
    log_info "启动后端服务..."
    cd "$PROJECT_DIR"
    nohup node "$SERVER" > "$SERVER_LOG" 2>&1 &
    SERVER_PID=$!
    echo "$SERVER_PID" > "$PID_FILE"

    # 等待后端就绪
    for i in $(seq 1 10); do
        if curl -s http://localhost:$PORT/api/status > /dev/null 2>&1; then
            log_info "后端服务已就绪 (PID: $SERVER_PID)"
            break
        fi
        sleep 1
    done

    # 2. 启动 Chromium kiosk
    log_info "启动 Chromium 全屏..."
    DISPLAY=:0 nohup /usr/bin/chromium \
        --use-gl=egl \
        --no-sandbox \
        --gpu-sandbox-start-early \
        --ignore-gpu-blacklist \
        --ignore-gpu-blocklist \
        --enable-accelerated-video-decode \
        --enable-features=VaapiVideoDecoder \
        --kiosk \
        --no-first-run \
        --noerrdialogs \
        --disable-session-crashed-bubble \
        --window-size=1920,1080 \
        http://localhost:$PORT \
        > "$CHROMIUM_LOG" 2>&1 &

    sleep 2
    if pgrep -f "chromium.*kiosk" > /dev/null 2>&1; then
        log_info "Chromium kiosk 已启动"
    else
        log_error "Chromium 启动失败，查看日志: $CHROMIUM_LOG"
    fi

    log_info "==================================="
    log_info "  device-ui 已启动"
    log_info "  访问地址: http://localhost:$PORT"
    log_info "==================================="
}

# ── 重启 ──────────────────────────────────────────
do_restart() {
    do_stop
    sleep 2
    do_start
}

# ── 状态 ──────────────────────────────────────────
do_status() {
    echo ""
    echo "══════════════════════════════════"
    echo "  device-ui 服务状态"
    echo "══════════════════════════════════"

    # 后端状态
    if curl -s http://localhost:$PORT/api/status > /dev/null 2>&1; then
        echo -e "  后端服务:   ${GREEN}运行中${NC} (:$PORT)"
        if [ -f "$PID_FILE" ]; then
            echo "  进程 PID:   $(cat $PID_FILE)"
        fi
    else
        echo -e "  后端服务:   ${RED}未运行${NC}"
    fi

    # Chromium 状态
    if pgrep -f "chromium.*kiosk" > /dev/null 2>&1; then
        echo -e "  Chromium:   ${GREEN}运行中${NC} (kiosk :0)"
    else
        echo -e "  Chromium:   ${RED}未运行${NC}"
    fi

    echo "──────────────────────────────────"
    echo "  日志文件:   $SERVER_LOG"
    echo "  启动脚本:   $0"
    echo "══════════════════════════════════"
    echo ""
}

# ── 查看日志 ──────────────────────────────────────
do_log() {
    if [ -f "$SERVER_LOG" ]; then
        tail -30 "$SERVER_LOG"
        echo ""
        echo "--- 实时日志 (Ctrl+C 退出) ---"
        tail -f "$SERVER_LOG"
    else
        log_error "日志文件不存在: $SERVER_LOG"
    fi
}

# ── 主入口 ────────────────────────────────────────
case "${1:-}" in
    start)   do_start ;;
    stop)    do_stop ;;
    restart) do_restart ;;
    status)  do_status ;;
    log)     do_log ;;
    *)
        echo "用法: $0 {start|stop|restart|status|log}"
        echo ""
        echo "  start   启动 device-ui 服务 (后端 + Chromium 全屏)"
        echo "  stop    停止 device-ui 服务"
        echo "  restart 重启 device-ui 服务"
        echo "  status  查看服务运行状态"
        echo "  log     查看后端日志"
        exit 1
        ;;
esac
