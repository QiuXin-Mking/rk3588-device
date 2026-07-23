# 03 — device-ui 界面 Demo（清洁版）

> 从 `device-ui/` 提取的有效代码，已去除 .bak 备份文件

## 架构

```
03-抄device-ui的界面demo/
├── server.js              # Node.js 后端 (1280行, 零npm依赖)
├── config/
│   ├── settings.json      # 运行时配置
│   └── stereo_calibration.json  # 双目标定参数
└── static/
    ├── index.html         # SPA 壳 (6个Tab页)
    ├── app.js             # 前端逻辑 (SPA路由 + API调用)
    ├── i18n.js            # 中英文翻译
    ├── style.css          # 暗色主题样式
    └── touch-feedback.js  # 触屏涟漪特效 (kiosk体验)
```

## 前端 6 个 Tab 页

| 页 | 功能 |
|----|------|
| Record  | 摄像头预览 + 录制控制 + 传感器状态 |
| WiFi    | 扫描/连接 WiFi、开启热点 |
| BT      | 蓝牙手套扫描/连接/校准 |
| Files   | 录制文件浏览/删除/重命名 |
| Export  | WiFi 导出到 PC/手机 |
| Settings| 出厂重置 |

## 后端 API (server.js)

- `:8080` — Web UI 主端口
- `:8888` — 手套校准器代理
- Unix socket `/tmp/stereo_ctl.sock` — 摄像头 daemon 通信

## 启动

```bash
cd /path/to/device-ui
PORT=8080 RECORD_DIR=/mnt/ums/records node server.js &
```

然后浏览器打开 `http://设备IP:8080`。
