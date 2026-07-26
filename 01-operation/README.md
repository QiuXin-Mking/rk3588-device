# device-ui 运维手册

RK3588 设备端 UI 服务的启动、停止与日常运维。

## 架构

```
Chromium (kiosk :0)  ←→  Node.js server.cjs (:8080)  ←→  static/ (React 构建产物)
     触摸屏                        后端 API                      前端页面
```

## 快速操作

在 RK3588 上 SSH 登录后：

```bash
cd /root/ui
bash 01-operation/device-ui-operate.sh start     # 启动
bash 01-operation/device-ui-operate.sh stop      # 停止
bash 01-operation/device-ui-operate.sh restart   # 重启
bash 01-operation/device-ui-operate.sh status    # 状态
bash 01-operation/device-ui-operate.sh log       # 日志
```

## 同步新版本

从开发机同步代码到 RK3588：

```bash
# 在开发机上执行
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.pnpm-store' \
  ./device-ui/ \
  root@192.168.100.200:/root/ui/

# 同步完成后在 RK3588 上重启
ssh root@192.168.100.200 "cd /root/ui && bash 01-operation/device-ui-operate.sh restart"
```

## 构建前端

前端需要先在开发机上构建：

```bash
cd device-ui
pnpm install
pnpm build          # 输出到 static/
```

## 服务组成

| 组件 | 端口/显示 | 说明 |
|------|-----------|------|
| server.cjs | :8080 | Node.js HTTP 服务，提供 API + 静态文件 |
| Chromium | :0 | 全屏浏览器，kiosk 模式，加载 localhost:8080 |

## 日志位置

| 日志 | 路径 |
|------|------|
| 后端日志 | `/tmp/device-ui.log` |
| Chromium 日志 | `/tmp/chromium-ui.log` |

## 已知问题

- Chromium 启动时会出现 `libGL error: failed to load driver: rockchip`、`Failed to connect to the bus` — 这是 RK3588 的正常日志，不影响使用
- 触摸屏光标会闪烁鼠标箭头，需要在新版 CSS 中补 `cursor: none`
- `package.json` 有 `"type": "module"`，`server.cjs` 使用 `.cjs` 扩展名避免冲突
