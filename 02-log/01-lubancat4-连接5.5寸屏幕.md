# LubanCat 4 连接 5.5 寸 MIPI 屏幕

> 硬件：Embedfire LubanCat-4 V1 (RK3588)
> 屏幕：野火 5.5 寸 MIPI DSI，1080×1920 竖屏
> 记录时间：2026-07-23

---

## 一、屏幕参数

| 参数 | 值 |
|------|-----|
| 尺寸 | 5.5 寸 |
| 分辨率 | 1080×1920（竖屏） |
| 刷新率 | 60Hz |
| 像素格式 | RGB888 |
| DSI Lane | 4-Lane |
| 接口 | MIPI DSI，30Pin FPC，0.5mm 间距，上翻下盖 |
| 触摸 | 五点电容触控 |
| 连接位置 | **dsi0**（板子背面） |

## 二、版本区分

| 版本 | 背板丝印 | 状态 |
|------|---------|------|
| 旧款 | **EBF410125** | 已停售 |
| 新款 | **EBF410125V1R0**（带 EEPROM） | 目前在售 |

不同版本的 dtoverlay 文件名不同，配置时要对应。

---

## 三、硬件接线

### ⚠️ 重要警告

**MIPI DSI 不支持热插拔！必须在断电状态下连接或拆卸屏幕，否则可能导致板卡短路甚至烧毁芯片。**

### 接线步骤

1. **断电** —— 拔掉 LubanCat 4 的电源
2. 找到板子**背面**的 **dsi0** 接口（30Pin FPC 座子）
3. 将 5.5 寸屏幕的 FPC 排线插入 dsi0 接口
   - 排线方向：**上翻下盖式，触点朝下**
   - 确认排线完全插入、卡扣锁紧
4. 上电

### ds0 接口位置

```
LubanCat-4 板子背面示意：

    ┌──────────────────────────────┐
    │                              │
    │    dsi0 接口 ← 30Pin FPC     │
    │    (屏幕排线插这里)           │
    │                              │
    └──────────────────────────────┘
```

---

## 四、软件配置

### 4.1 编辑 uEnv.txt

```bash
ssh root@192.168.100.200
cat /boot/uEnv/uEnv.txt
```

找到 `#dsi0 in vp2` 段，根据屏幕版本取消对应行的注释：

**旧款 EBF410125：**
```
dtoverlay=/dtb/overlay/rk3588s-lubancat-4-dsi0-1080p-overlay.dtbo
```

**新款 EBF410125V1R0：**
```
dtoverlay=/dtb/overlay/rk3588s-lubancat-4-v1-dsi0-generic-overlay.dtbo
```

> **新款自动识别：** 如果镜像是 2026 年 1 月之后发布的且屏幕为新款（带 EEPROM），系统启动时会自动识别屏幕并加载驱动，无需手动修改。如需关闭自动加载，将 `enable_gsdt_auto_load` 改为 `0`。

### 4.2 重启

```bash
sudo reboot
```

---

## 五、验证屏幕是否点亮

```bash
# 1. 查看 DRM 设备列表
ls /sys/class/drm/
# 正常输出应有：card0  card0-DSI-1  card0-HDMI-A-1  renderD128

# 2. 检查连接状态
cat /sys/class/drm/card0-DSI-1/status
# 正常：connected

# 3. 检查是否已启用
cat /sys/class/drm/card0-DSI-1/enabled
# 正常：enabled

# 4. 查看支持的分辨率
cat /sys/class/drm/card0-DSI-1/modes
# 正常：1080x1920

# 5. 内核日志检查
dmesg | grep -iE "dsi|panel|mipi" | tail -30
```

如果 `status=connected` 且 `enabled=enabled`，屏幕背光应该已经亮了。

---

## 六、关闭屏幕

在 `/boot/uEnv/uEnv.txt` 中重新注释掉对应的 dtoverlay 行，重启即可。

---

## 七、I2C 冲突注意

dsi0 屏幕占用了 I2C-5（40Pin 排针的 Pin 3/5），因此在接屏幕的情况下：

| 40Pin 引脚 | 总线 | 屏幕状态 |
|-----------|------|---------|
| Pin 3/5 | I2C-5 | ❌ 被 MIPI DSI 屏幕占用 |
| **Pin 27/28** | **I2C-6** | ✅ 空闲可用 |

如果还需要接 I2C 外设（如 AS5600 磁编码器），使用 **Pin 27/28 (I2C-6)**，详见 [AS5600 连线文档](../../06-磁编码器/01-连线分析+驱动测试/01-lubancat4-gpio.md)。

---

## 八、排查指南

| 现象 | 可能原因 | 排查方法 |
|------|---------|---------|
| 屏幕完全不亮（背光也不亮） | 硬件接线／供电问题 | 万用表测供电引脚电压 |
| 屏幕不亮但背光亮 | DTS overlay 未加载 | `dmesg \| grep -i panel` |
| `status=disconnected` | 排线没插好／方向反了／dtoverlay 选错 | 重新插拔，确认 overlay 对应屏幕版本 |
| `modes` 为空 | panel 驱动 probe 失败 | `dmesg \| grep -i "failed"` |
| 画面撕裂 | TE 信号未同步 | 检查 FPC 排线是否完全插入 |
| 触摸无效 | I2C 触摸驱动未加载 | `dmesg \| grep -i touch`，`ls /dev/input/` |

---

## 相关文档

- [MIPI 屏幕调试 + UI 开发指南](../../07-mipi屏幕调试/01-mipi屏幕调试指南.md) — 完整的屏幕调试、UI 开发、Chromium Kiosk 部署流程
- [LubanCat 4 GPIO / 40Pin 引脚图](../../06-磁编码器/01-连线分析+驱动测试/01-lubancat4-gpio.md)
- [野火官方文档 - 屏幕配件](https://doc.embedfire.com/linux/rk3588/quick_start/zh/latest/quick_start/screen/screen.html)
