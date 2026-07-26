# WiFi 重启后不自动连接 — 问题排查与修复

> 日期：2026-07-23
> 硬件：LubanCat-4 V1 (RK3588), Debian 11

---

## 现象

`/mnt/wifi.conf` 配置了正确的 SSID 和密码，但重启后 WiFi 不会自动连接：

```ini
# /mnt/wifi.conf
SSID=SZ91863728%20
PASSWORD=slzh26070811
SECURITY=wpa-psk
```

---

## 根因分析

### 根因 1：autoconnect=no

```bash
nmcli -t -f connection.autoconnect connection show 'SZ91863728%20'
# connection.autoconnect:no
```

**来源：** `server.js` 启动时会调用 `disableAllWifiAutoconnect()`，把所有已保存的 WiFi 连接 profile 的 autoconnect 设为 no。这是产品的设计逻辑（客户每次手动连接 WiFi，重启后不自动回连），但对于通过 `wifi.conf` 自动配置的场景不合适。

```javascript
// server.js:403-416
async function disableAllWifiAutoconnect() {
  const list = await sh(`nmcli -t -f NAME,TYPE connection show 2>/dev/null`, 8000);
  for (const line of list.split('\n')) {
    const idx = line.lastIndexOf(':');
    const name = line.slice(0, idx);
    const type = line.slice(idx + 1);
    if (!/wireless|wifi/i.test(type) || !name) continue;
    await shFull(`nmcli connection modify ${JSON.stringify(name)} connection.autoconnect no`, 8000);
  }
}
```

### 根因 2：rc.local 无重试机制

旧版 rc.local 的 WiFi 连接逻辑：

```bash
# 兜底：从 wifi.conf 连接 WiFi
if [ -f /mnt/wifi.conf ] && ! ip addr show wlan0 | grep -q "inet "; then
    . /mnt/wifi.conf
    nmcli dev wifi connect "$SSID" password "$PASSWORD" 2>/dev/null || true
fi
```

问题：
- `nmcli dev wifi connect` 在 rc.local 执行时 NetworkManager 可能还未完全就绪
- `2>/dev/null || true` 吞掉了所有错误，无法定位失败原因
- 只尝试一次，失败就放弃

---

## 修复方案

### 修复 1：恢复 autoconnect（临时）

```bash
nmcli connection modify 'SZ91863728%20' connection.autoconnect yes
```

> ⚠️ 注意：这是临时修复，`server.js` 每次启动都会重新把 autoconnect 关掉。长远需要修改 server.js 对 wifi.conf 场景做例外处理。

### 修复 2：加固 rc.local（长期）

```bash
# /etc/rc.local 新版 WiFi 连接逻辑
if [ -f /mnt/wifi.conf ] && ! ip addr show wlan0 | grep -q 'inet '; then
    . /mnt/wifi.conf
    for i in 1 2 3 4 5; do
        sleep 5
        if nmcli -t -f GENERAL.STATE dev show wlan0 2>/dev/null | grep -q 'unmanaged'; then
            continue
        fi
        if nmcli dev wifi connect "$SSID" password "$PASSWORD" 2>/dev/null; then
            break
        fi
        logger -t rc.local "WiFi connect attempt $i failed, retrying..."
    done
fi
```

改进点：
- 最多 5 次重试，每次间隔 5 秒（总共 25 秒窗口）
- 跳过 wlan0 状态为 `unmanaged` 的轮次（NM 还没接管设备）
- 用 `logger` 记录失败日志到 syslog，方便排查

---

## 验证

```bash
# 手动测试
nmcli dev wifi connect 'SZ91863728%20' password 'slzh26070811'
# 输出：成功用 "wlan0..." 激活了设备 ""

# 确认已连上
nmcli dev status | grep wlan0
# wlan0  wifi  已连接  SZ91863728%20

# 验证有 IP
ip addr show wlan0 | grep "inet "
# inet 192.168.x.x/24 ...
```

---

## 待办

- [ ] 修改 `server.js` 的 `disableAllWifiAutoconnect()`，对通过 `wifi.conf` 创建的连接做例外（不关 autoconnect）
- [ ] 添加 systemd 服务实现真正的开机自启动 WiFi（替代 rc.local）
