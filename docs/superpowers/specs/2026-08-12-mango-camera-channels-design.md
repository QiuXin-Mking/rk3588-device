# Mango 相机通道映射设计

## 目标

数据页和相机画面页根据当前产品显示对应相机通道，避免 Mango 继续沿用 Banana 的手部双目名称和状态。

## 产品映射

| 产品 | 通道 | 状态来源 |
| --- | --- | --- |
| Banana | 头部双目 | `Ego_H` 双目状态 |
| Banana | 头部四目 | `Ego_H` 四目状态 |
| Banana | 左手双目 | 左指尖夹爪无线或 USB 状态 |
| Banana | 右手双目 | 右指尖夹爪无线或 USB 状态 |
| Mango | 头部双目 | `Ego_H` 双目状态 |
| Mango | 头部四目 | `Ego_H` 四目状态 |
| Mango | 左腕部单目 | `Ego_W_L` 相机状态 |
| Mango | 右腕部单目 | `Ego_W_R` 相机状态 |

## 实现边界

- `RealtimeScreen` 根据 `product` 生成四个相机通道。
- `CameraScreen` 接收当前 `product`，使用相同映射显示画面卡片。
- Mango 腕部状态继续兼容现有相机键名：
  - 左腕：`ego_w_left`、`ego_w_l`、`wrist_left`、`jhh2_left`
  - 右腕：`ego_w_right`、`ego_w_r`、`wrist_right`、`jhh2_right`
- 不修改后端 API、采集服务或设备发现逻辑。

## 验证

- 单元测试确认 Banana 仍显示“左手双目 / 右手双目”。
- 单元测试确认 Mango 显示“左腕部单目 / 右腕部单目”，且不出现手部双目名称。
- 单元测试确认 Mango 腕部相机键能够驱动对应通道在线状态。
- 运行完整测试、生产构建，并在本机页面验证产品切换。
