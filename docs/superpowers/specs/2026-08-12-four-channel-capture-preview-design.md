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

## 临时预览 Session 生命周期

`unified_capture` 只有在 session 运行时才创建四路视频采集线程，因此 device-ui 的实时预览必须启动一个临时采集 session。

### 启动预览

1. 在 `_recBusy` 保护内读取 `CAPTURE_DATA_DIR` 下现有的 `session_NNN` 目录集合。
2. 向 unified_capture 发送 `start`。
3. 轮询 `status`，直到 `running=true`。
4. 再次读取 session 集合，要求相对启动前恰好新增一个目录。
5. 新目录必须满足：
   - 直接位于 `CAPTURE_DATA_DIR` 下；
   - basename 严格匹配 `^session_[0-9]{3,}$`；
   - `realpath` 后仍位于 `CAPTURE_DATA_DIR` 内。
6. 在新目录写入空标记文件 `.device-ui-preview`。
7. 将该目录保存为进程内 `_capturePreviewDir`，并返回预览启动成功。

若 session 未启动、没有新增目录或新增目录不止一个，则返回失败；未能唯一识别的目录不得自动删除。

### 停止预览

1. 向 unified_capture 发送 `stop` 并等待 `running=false`。
2. 仅当 `_capturePreviewDir` 同时通过以下校验时删除：
   - 位于 `CAPTURE_DATA_DIR` 直接子目录；
   - basename 匹配 `session_NNN`；
   - 目录内存在 `.device-ui-preview` 标记。
3. 删除目标必须使用已经校验的绝对路径，不允许 glob、未解析变量或宽泛目录。
4. 清空 `_capturePreviewDir`。

### 提升为正式录制

用户在预览中点击“开始录制”时：

1. 不停止、不重启 unified_capture，保持四路连续采集。
2. 删除 `_capturePreviewDir/.device-ui-preview` 标记。
3. 清空 `_capturePreviewDir`，使当前 session 立即转为正式记录。
4. 返回 `{ ok: true, promoted: true }`。

正式录制停止继续走现有 `captureCtl('stop')`。没有标记的 session 永远不得由预览清理逻辑删除。

### 重启与异常恢复

- 文件列表扫描忽略含 `.device-ui-preview` 的临时 session，避免预览出现在“记录”页面。
- device-ui 进程重启后不自动删除任何遗留标记目录；自动推断并删除存在误删风险。
- 遗留临时目录由运维明确检查后处理，本次不增加开机清理。

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
- 预览启动只接受唯一新增且路径合法的 `session_NNN`，并创建标记。
- 预览停止只删除带标记的精确 session 目录。
- 正式录制提升只移除标记并保留目录。
- 记录列表忽略带 `.device-ui-preview` 标记的 session。
- 多个新增目录、路径越界或标记缺失时拒绝删除。

## 硬件验收

在 `rk.local` 上部署两个仓库后：

1. 确认 `unified_capture` 与 `device-ui` 服务均为 active。
2. 启动实时预览。
3. 分别请求四条 HTTP 路径，确认均返回 HTTP 200、`image/jpeg` 且文件非空。
4. 对四张 JPEG 计算哈希；不得全部相同。
5. 在设备屏幕确认四张卡片名称正确、画面不串路、停止预览后不再刷新。
6. 执行一次短录制，确认四路预览改动未破坏录制启动与停止。
7. 确认停止预览后临时 session 被删除；预览提升录制后对应 session 保留且出现在记录页面。

## 不在本次范围

- 视频流协议（MJPEG、WebRTC 或 HLS）改造。
- 调整采集分辨率、帧率、编码或录制目录结构。
- Cherry 产品预览。
- 四路画面的裁剪、拼接或畸变校正。
