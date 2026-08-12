# 架构决策记录 (ADR)

## 001: unified_capture 后端适配 — server.cjs 适配层，前端不动

**日期:** 2026-07-26

**状态:** 已采纳

**问题:**

device-ui 当前后端对接两种摄像头系统：
- **Orbbec 深度相机** — 通过 guidaview systemd 服务控制，Volume-Up 按键模拟录制启停
- **DECXIN 双目相机** — 通过 `/tmp/stereo_ctl.sock` Unix socket 控制

现需对接第三种后端：**unified_capture**（4 路摄像头 + IMU + AS5600 + VIVE），其 Unix socket 在 `/tmp/unified_capture.sock`，协议为 `start/stop/status`。如何以最小代价接入？

**方案分析:**

| 方案 | 描述 | 前端改动 | 风险 |
|------|------|---------|------|
| A: **server.cjs 适配层** | 在 server.cjs 中新增 unified_capture 分支，映射到现有 API 响应格式 | 几乎为零（仅类型扩展） | 低 |
| B: 新增独立后端服务 | 写一个新的 Node.js 服务专门对接 unified_capture，前端同时连两个后端 | 中（多后端 URL） | 中 |
| C: 前端直连云心 socket | 前端通过 WebSocket 或 HTTP 代理直连 unified_capture socket | 大（全新通信层） | 高 |

**决策:**

采纳 **方案 A**。

**实现细节:**

1. **模式检测:** `captureActive()` 自动检测 `/tmp/unified_capture.sock` 是否响应，3 秒缓存
2. **API 映射:**
   - `apiRecordToggle` → `captureCtl('start'/'stop')`
   - `getRecordStatus` → `captureCtl('status')` → 字段映射
   - `apiCameraPreview` → `captureCtl('preview:<path>')` + 重试等待
   - `apiFiles` → `scanCaptureSessions()` 扫描 `session_NNN` 目录树
3. **文件路径:** capture 模式使用 `/data/capture`，旧模式保持 `/media/usb0/records`
4. **互斥性:** 两套系统共享 USB 设备，物理上不同时运行，自动检测即可

**后果:**

- server.cjs 新增 ~250 行，但改动集中在独立的 capture 分支中，不改变旧代码行为
- 前端仅新增 4 个可选字段（`cameras`, `imu`, `as5600`, `vive`），完全向后兼容
- 如果 unified_capture 未运行，server.cjs 自动 fallback 到旧的 guidaview/stereo 逻辑

---

## 002: 预览帧重试策略 — 20×50ms 轮询等待

**日期:** 2026-07-26

**状态:** 已采纳

**问题:**

`apiCameraPreview` 通过 socket 命令 `preview:<path>` 请求 unified_capture 生成 JPEG。但 socket handler 只设置 `g_preview_pending` 标志并立即返回 `{"ok":true}`，实际的 JPEG 由 VideoSensor::collect() 线程在下一次 BGR 解码时异步写入。如果 server.cjs 在收到 `ok` 响应后立即检查文件存在性，大概率文件尚未写入（帧间隔 ~33ms@30fps，加上 JPEG 编码耗时 ~5ms，总共约 38ms）。

**方案分析:**

| 方案 | 描述 | 复杂度 |
|------|------|--------|
| A: server.cjs 侧轮询等待 | 收到 ok 响应后重试 `fs.existsSync()` | 低 |
| B: unified_capture 侧同步返回 | socket handler 阻塞等待 JPEG 写入完成再返回 | 中（需跨线程同步） |
| C: 前端降级处理 | 前端 503 时自动重试（已每 850ms 轮询） | 零改动，但首帧必 503 |

**决策:**

采纳 **方案 A**（server.cjs 侧轮询），辅以方案 C（前端自然重试）。

**实现细节:**

```js
const r = await captureCtl(`preview:${PREVIEW_FILE}`, 5000);
if (r && r.ok) {
  for (let i = 0; i < 20; i++) {        // 最多等 1 秒
    if (fs.existsSync(PREVIEW_FILE)) {
      // 读到文件，立即返回
      const data = fs.readFileSync(PREVIEW_FILE);
      res.writeHead(200, { 'Content-Type': 'image/jpeg', ... });
      return res.end(data);
    }
    await new Promise(r => setTimeout(r, 50));  // 每 50ms 检查一次
  }
}
res.writeHead(503);
```

**后果:**

- 正常情况：1-2 次循环（50-100ms）内读到文件
- 异常情况：1 秒后返回 503，前端 850ms 后自动重试
- 极端情况（摄像头掉线）：每 850ms 一次 503，不会造成雪崩
