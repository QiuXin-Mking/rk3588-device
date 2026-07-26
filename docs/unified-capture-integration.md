# unified_capture 对接记录（device-ui 侧）

> 日期: 2026-07-26
> 关联仓库: unified_capture (../01-统一采集方案/unified_capture/)

## 对接概述

device-ui 的 `server.cjs` 新增了 unified_capture 后端支持。当 unified_capture 的 Unix socket (`/tmp/unified_capture.sock`) 存在时，server.cjs 自动切换到 unified_capture 模式，不需要手动配置。

## 改动文件

### server.cjs — 主要改动（~250 行新增）

#### 1. Socket 适配层（+50 行）

- `CAPTURE_SOCK = '/tmp/unified_capture.sock'`
- `captureCtl(cmd, timeoutMs)` — 短连接 Unix socket 通信，与 `stereoCtl()` 相同模式
- `captureActive()` — 带 3 秒缓存的模式检测

#### 2. 录制控制（+40 行）

- `apiRecordToggle()` — 新增 unified_capture 分支：start/stop 通过 socket
- `getRecordStatus()` — 新增 unified_capture 分支：从 status 命令获取 camera/IMU 状态
- 响应新增 `cameras`, `imu`, `as5600`, `vive` 扩展字段

#### 3. 实时预览（+35 行）

- `apiLiveStart()` / `apiLiveStop()` — arm/disarm `_stereoPreview` 标志
- `apiCameraPreview()` — 通过 socket 请求 JPEG + 1 秒重试等待

#### 4. 文件管理（+120 行）

- `scanCaptureSessions()` — 新函数，扫描 `/data/capture/session_NNN/` 目录树
- `apiFiles()` — 新增 unified_capture 分支
- `apiFilesDelete()`, `apiDecode()`, `apiTransfer()`, `apiRecordingFile()` — 路径适配
- `apiStatus()` — 新增 `captureStatus` 字段

### frontend/ — 类型扩展（~20 行）

- `deviceApi.ts`: `DeviceStatus.captureStatus`, `RecordStatus` 新增 `cameras/imu/as5600/vive`
- `model.ts`: `FALLBACK_RECORD` 新增字段默认值
- 所有新增字段为可选（`?:`），向后兼容

### 01-operation/device-ui-operate.sh — 部署脚本（+15 行）

- 启动 Node.js 后端前等待 unified_capture socket 就绪

## API 响应变更

### GET /api/record/status（新增字段）

```json
{
  "cameras": {"jhh2_left": true, "jhh2_right": false},
  "imu": true,
  "as5600": false,
  "vive": false
}
```

### GET /api/status（新增字段）

```json
{
  "captureStatus": {
    "ready": true,
    "recording": false,
    "cameras": {"jhh2_left": true},
    "imu": true,
    "as5600": false,
    "vive": false
  }
}
```

### GET /api/files（根路径变更）

- unified_capture 模式: `root = "/data/capture"`
- 旧模式: `root = "/mnt/ums/records"`（不变）

## 提交历史

```
a528a15 fix(server): add retry loop for preview JPEG file availability
dcab98e feat: wait for unified_capture socket before starting UI
d243130 feat(frontend): add unified_capture type extensions (Phase 4)
c491b19 feat(server): adapt file management for unified_capture (Phase 3)
58affd1 feat(server): route camera preview through unified_capture (Phase 2)
455612c feat(server): add unified_capture control integration (Phase 1)
```
