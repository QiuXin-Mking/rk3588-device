# 任务采集四通道实时预览设计

## 目标

将“数据 → 开始采集 → 任务采集”的预览区从错误的 `FPV_L / FPV_R` 两路占位，升级为 Mango 套件的四路真实相机预览，并保证每张卡片只能取得指定物理相机的画面。

## 通道映射

| 前端名称 | HTTP 路径 | unified_capture 通道 | 物理来源 |
| --- | --- | --- | --- |
| 头部双目 | `/api/camera/preview/head-stereo` | `jhh02` | 六目设备中的双目模组 |
| 头部四目 | `/api/camera/preview/head-four` | `jhh04` | 六目设备中的四目模组 |
| 左腕部单目 | `/api/camera/preview/wrist-left` | `jhh2_left` | 左腕部 Ego |
| 右腕部单目 | `/api/camera/preview/wrist-right` | `jhh2_right` | 右腕部 Ego |

## unified_capture 协议

### 新协议

Unix Socket 命令新增：

```text
preview:<channel>:<absolute-output-path>
```

其中 `<channel>` 只允许：

- `jhh02`
- `jhh04`
- `jhh2_left`
- `jhh2_right`

非法通道、空路径或非绝对路径返回错误，不创建文件。

### 向后兼容

保留旧命令：

```text
preview:<absolute-output-path>
```

旧命令继续使用原有“任一视频线程领取”的行为，避免破坏已有 device-ui 或调试脚本。新四路 HTTP 接口只使用带通道的新协议。

### 并发模型

现有 `VideoCaptureControl` 只有一个全局待处理槽，四个视频线程会竞争同一个请求。改为按通道保存待处理请求：

- 每个通道最多保留一个最新请求。
- `VideoFrameProcessor` 使用自身 `camera_name` 领取同名通道请求。
- `jhh02`、`jhh04`、`jhh2_left`、`jhh2_right` 可并行生成各自 JPEG。
- 一个线程不能领取其他通道请求。
- JPEG 继续先写 `.tmp` 再原子重命名，防止 HTTP 读取半张图片。

## device-ui 后端

新增四条 GET 路由：

```text
GET /api/camera/preview/head-stereo
GET /api/camera/preview/head-four
GET /api/camera/preview/wrist-left
GET /api/camera/preview/wrist-right
```

每条路由执行以下流程：

1. 校验 `_stereoPreview` 已由 `/api/camera/live/start` 激活。
2. 映射到固定 unified_capture 通道。
3. 使用该通道独立临时文件，例如 `/tmp/camera_preview_jhh02.jpg`。
4. 发送 `preview:<channel>:<path>`。
5. 等待新文件生成后返回 `image/jpeg` 和 `Cache-Control: no-store`。
6. 通道未连接、预览未启动或超时返回 503。

现有 `GET /api/camera/preview` 保留，继续兼容旧单路预览模式。

为了避免返回上一次请求的旧 JPEG，发请求前删除该通道旧文件，等待本次请求生成的新文件。

## 前端

`CaptureScreen` 接收当前产品，并在 Mango 下将预览区改成 2×2 四张卡片：

- 头部双目
- 头部四目
- 左腕部单目
- 右腕部单目

四张卡片分别轮询对应 HTTP 路径，并使用 `record.cameras` 中的对应通道状态控制在线/离线显示。点击“实时预览”仍只调用一次 `/api/camera/live/start`；停止和录制流程保持不变。

Banana 本次不新增硬件映射，继续保留其现有预览兼容行为，避免将 Mango 的腕部通道错误应用到 Banana。

## 测试

### unified_capture 单元测试

- 解析四个合法带通道预览命令。
- 拒绝非法通道、空通道和空路径。
- 旧 `preview:<path>` 仍可解析。
- 按通道请求只能被同名处理器领取。
- 四个通道的请求互不覆盖。

### device-ui 测试

- HTTP 路由映射到正确的内部通道和独立预览文件。
- 未启动预览、非法路径和生成超时返回正确状态。
- Mango `CaptureScreen` 显示四个正确名称且不再出现 `FPV_L / FPV_R`。
- 四个预览卡片使用四个不同 URL。

## 硬件验收

在 `rk.local` 上部署两个仓库后：

1. 确认 `unified_capture` 与 `device-ui` 服务均为 active。
2. 启动实时预览。
3. 分别请求四条 HTTP 路径，确认均返回 HTTP 200、`image/jpeg` 且文件非空。
4. 对四张 JPEG 计算哈希；不得全部相同。
5. 在设备屏幕确认四张卡片名称正确、画面不串路、停止预览后不再刷新。
6. 执行一次短录制，确认四路预览改动未破坏录制启动与停止。

## 不在本次范围

- 视频流协议（MJPEG、WebRTC 或 HLS）改造。
- 调整采集分辨率、帧率、编码或录制目录结构。
- Cherry 产品预览。
- 四路画面的裁剪、拼接或畸变校正。
