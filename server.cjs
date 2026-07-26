'use strict';
//
// ═══════════════════════════════════════════════════════════════════════════════
// TODO(v0.2): 后端接口实现清单 — 前端驱动 (frontend/src/services/deviceApi.ts)
// ═══════════════════════════════════════════════════════════════════════════════
//
//  1. GET    /api/status              设备综合状态
//  2. GET    /api/settings             POST 读取/保存设置
//  3. GET    /api/record/status        录制状态
//  4. POST   /api/record/toggle        切换录制
//  5. POST   /api/camera/live/start    开始预览
//  6. POST   /api/camera/live/stop     停止预览
//  7. GET    /api/camera/preview       摄像头帧 (JPEG)
//  8. GET    /api/files                录制列表
//  9. DELETE /api/files/:name          删除录制
// 10. POST   /api/recordings/:name/decode  解码 IMU
// 11. POST   /api/recordings/:name/transfer → USB
// 12. GET    /api/recordings/:name/preview  H.264 预览
// 13. GET    /api/recordings/:name/:file    流式文件
// 14. GET    /api/wifi/scan            WiFi 扫描
// 15. POST   /api/wifi/connect         WiFi 连接
// 16. POST   /api/wifi/disconnect      WiFi 断开
// 17. GET    /api/bt/scan              BT 扫描
// 18. POST   /api/bt/connect           BT 连接手套
// 19. POST   /api/bt/disconnect        BT 断开手套
// 20. POST   /api/calibrator           校准器管理
// 21. POST   /api/calibrate/start      开始校准
// 22. POST   /api/calibrate/stop       停止校准
// 23. ANY    /api/glove/cal/*          校准代理 (→ :8888)
//
// ═══════════════════════════════════════════════════════════════════════════════
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const { exec, execFile, spawn } = require('child_process');
const url   = require('url');
const net   = require('net');

const PORT       = parseInt(process.env.PORT || '8080', 10);
const STATIC_DIR = path.join(__dirname, 'static');
const RECORD_DIR = process.env.RECORD_DIR || '/mnt/ums/records';
const CAL_SVC    = 'worldintel-glove-calibrator.service';
const WIRED_REC_SVC = 'worldintel-wired-recorder';
const CAL_PORT   = parseInt(process.env.CAL_PORT || '8888', 10);
const CAL_URL    = `http://localhost:${CAL_PORT}`;
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
// Battery fuel-gauge chip (and whether it exposes `status` itself or needs a
// separate charger node for that) differs by board revision:
//   RK3588: cw2017-battery/{capacity,status,voltage_now}  (status on the same node)
//   RK3576: cw221X-bat/{capacity,voltage_now} + cw6116-charger/status
//           (cw221X-bat has NO status file at all)
// Auto-detect at startup instead of hardcoding one chip name, so the UI
// doesn't silently show a stuck 0% on whichever board doesn't match.
const PS_ROOT = '/sys/class/power_supply';
function _psType(name) {
  try { return fs.readFileSync(path.join(PS_ROOT, name, 'type'), 'utf8').trim(); } catch { return ''; }
}
function _detectPowerSupply() {
  let entries = [];
  try { entries = fs.readdirSync(PS_ROOT); } catch { return { bat: null, charger: null }; }
  const bat = entries.find(d => _psType(d) === 'Battery') || null;
  const charger = entries.find(d => /charger/i.test(d))
    || entries.find(d => d !== bat && ['USB', 'Mains'].includes(_psType(d)))
    || null;
  return { bat, charger };
}
const { bat: _BAT_NODE, charger: _CHG_NODE } = _detectPowerSupply();
const BAT_BASE = _BAT_NODE ? path.join(PS_ROOT, _BAT_NODE) : path.join(PS_ROOT, 'cw2017-battery');
const STATUS_BASE = (_BAT_NODE && fs.existsSync(path.join(BAT_BASE, 'status')))
  ? BAT_BASE
  : (_CHG_NODE ? path.join(PS_ROOT, _CHG_NODE) : BAT_BASE);
// Gloves now connect over Classic Bluetooth SPP (held by the recorder via
// `rfcomm connect`), NOT BLE.  These are the SPP MACs (04: prefix) that the
// recorder binds to rfcomm0 (right) / rfcomm1 (left) and that `rfcomm` reports.
// These MUST match the SPP MACs the recorder connects (start_spp_recorder.py,
// SPP_ADDR_RIGHT / SPP_ADDR_LEFT in worldintel-ble-recorder.service). Prefer the
// same env vars so a per-board MAC set in the unit is honored by BOTH services
// — otherwise the UI checks the wrong MAC and shows "disconnected" while the
// gloves are actually connected. The fallback is this board's current pair.
const BT_GLOVE      = process.env.SPP_ADDR_RIGHT || '04:26:04:09:0A:9B'; // right, rfcomm0
const BT_GLOVE_LEFT = process.env.SPP_ADDR_LEFT  || '04:26:04:15:0C:65'; // left,  rfcomm1
// Map side → MAC for convenience
const BT_GLOVES  = { right: BT_GLOVE, left: BT_GLOVE_LEFT };

// Wired (USB-serial) gloves: STM32 Virtual ComPort on /dev/ttyACM*, told apart
// by USB Product ID (same mapping the recorder + calibrator use).
//   0x5739 → left, 0x5740 → right.  Override via env.
const WIRED_PID_LEFT  = (process.env.GLOVE_PID_LEFT  || '5739').toLowerCase().replace(/^0x/, '').padStart(4, '0');
const WIRED_PID_RIGHT = (process.env.GLOVE_PID_RIGHT || '5740').toLowerCase().replace(/^0x/, '').padStart(4, '0');

// Read a ttyACM node's USB idProduct via sysfs (lowercase 4-hex), or null.
function _wiredPid(ttyName) {
  try {
    let d = fs.realpathSync(`/sys/class/tty/${ttyName}/device`);
    for (let i = 0; i < 6; i++) {
      const pf = path.join(d, 'idProduct');
      if (fs.existsSync(pf)) {
        return fs.readFileSync(pf, 'utf8').trim().toLowerCase().padStart(4, '0');
      }
      const parent = path.dirname(d);
      if (parent === d) break;
      d = parent;
    }
  } catch { /* no such device / unreadable */ }
  return null;
}

// Scan /dev/ttyACM* for wired gloves and map each to a hand by PID.
// Unknown-PID gloves fill an empty slot (left first), mirroring the recorder.
function getWiredGloves() {
  const sides = { left: false, right: false };
  let acm = [];
  try { acm = fs.readdirSync('/dev').filter(n => /^ttyACM\d+$/.test(n)); } catch { return sides; }
  const unknown = [];
  for (const n of acm) {
    const pid = _wiredPid(n);
    if (pid === WIRED_PID_LEFT) sides.left = true;
    else if (pid === WIRED_PID_RIGHT) sides.right = true;
    else unknown.push(n);
  }
  for (const _ of unknown) {
    if (!sides.left) sides.left = true;
    else if (!sides.right) sides.right = true;
  }
  return sides;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// ── helpers ───────────────────────────────────────────────────────────────────

// Like sh() but returns the full result (exit code + stdout + stderr) so
// callers can surface the real failure reason (e.g. wrong WiFi password).
function shFull(cmd, timeoutMs = 5000) {
  return new Promise(resolve => {
    exec(cmd, { timeout: timeoutMs }, (err, stdout, stderr) => {
      resolve({
        code: err ? (typeof err.code === 'number' ? err.code : 1) : 0,
        out: (stdout || '').trim(),
        err: (stderr || '').trim(),
      });
    });
  });
}

function sh(cmd, timeoutMs = 5000) {
  return new Promise(resolve => {
    const t = setTimeout(() => resolve(''), timeoutMs);
    exec(cmd, { timeout: timeoutMs }, (err, stdout) => {
      clearTimeout(t);
      resolve(err ? '' : stdout.trim());
    });
  });
}

function json(res, obj, status = 200) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', c => { s += c; if (s.length > 4096) reject(new Error('too large')); });
    req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

// ── Settings (post-capture toggle etc.) ───────────────────────────────────────
// TODO(v0.2): GET  /api/settings  — 读取设置
// TODO(v0.2): POST /api/settings  — 保存设置

function loadSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); }
  catch { return { postCaptureEnabled: true }; }
}
function saveSettings(s) {
  try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2)); } catch {}
}
async function apiGetSettings(req, res) {
  json(res, loadSettings());
}
async function apiSaveSettings(req, res) {
  const body = await readBody(req);
  const s = Object.assign(loadSettings(), body);
  saveSettings(s);
  json(res, s);
}

// ── Calibration proxy (device-ui → localhost:CAL_PORT) ────────────────────────

// TODO(v0.2): 校准代理 — /api/glove/cal/* → localhost:CAL_PORT（前端校准页面 iframe 内使用）
function proxyToCal(method, calPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: '127.0.0.1', port: CAL_PORT, path: calPath, method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = http.request(opts, r => {
      let buf = '';
      r.on('data', d => { buf += d; });
      r.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve({ ok: false, raw: buf }); } });
    });
    req.setTimeout(35000);
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('calibrator timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

async function apiCalProxy(req, res) {
  const parsed = url.parse(req.url || '/', true);
  // /api/glove/cal/collect?side=right  →  /api/calibrate/collect?side=right
  const calPath = (parsed.pathname || '/').replace('/api/glove/cal', '/api/calibrate') +
                  (parsed.search || '');
  try {
    const body = req.method === 'POST' ? await readBody(req) : null;
    const result = await proxyToCal(req.method, calPath, body);
    json(res, result);
  } catch (e) {
    json(res, { ok: false, error: e.message }, 502);
  }
}

// ── Static files ──────────────────────────────────────────────────────────────

function serveStatic(res, reqPath) {
  const safePath = reqPath === '/' ? '/index.html' : reqPath;
  const filePath = path.join(STATIC_DIR, safePath.replace(/\.\./g, ''));
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

// ── sysinfo ───────────────────────────────────────────────────────────────────
// TODO(v0.2): GET /api/status — 设备综合状态（电池/存储/WiFi/蓝牙/校准器/录制）

async function getBattery() {
  const [pct, status, voltStr] = await Promise.all([
    sh(`cat ${BAT_BASE}/capacity 2>/dev/null`),
    sh(`cat ${STATUS_BASE}/status 2>/dev/null`),
    sh(`cat ${BAT_BASE}/voltage_now 2>/dev/null`),
  ]);
  return {
    pct:     parseInt(pct, 10) || 0,
    status:  status || 'Unknown',
    voltage: voltStr ? (parseInt(voltStr, 10) / 1e6).toFixed(2) : null,
  };
}

async function getStorage() {
  const out = await sh(`df -k ${RECORD_DIR} 2>/dev/null || df -k /mnt/ums 2>/dev/null || df -k /`);
  const line = out.split('\n').find(l => /^\// .test(l));
  if (!line) return { used: 0, total: 0, pct: 0 };
  const parts = line.trim().split(/\s+/);
  const total = parseInt(parts[1], 10) * 1024;
  const used  = parseInt(parts[2], 10) * 1024;
  const pct   = total > 0 ? Math.round(used / total * 100) : 0;
  return { used, total, pct, mount: parts[5] || '' };
}

async function getWifi() {
  const out = await sh("nmcli -t -f ACTIVE,SSID,SIGNAL,SECURITY dev wifi 2>/dev/null | grep '^yes'");
  if (!out) return { connected: false, ssid: '', signal: 0 };
  const parts = out.split(':');
  return { connected: true, ssid: parts[1] || '', signal: parseInt(parts[2], 10) || 0, security: parts[3] || '' };
}

// Cache BT state per side — updated by log polling, not on every poll
let _btCache = {
  right: { connected: false, device: 'MXSPP_SENSOR', address: BT_GLOVE,      via: null },
  left:  { connected: false, device: 'MXSPP_SENSOR', address: BT_GLOVE_LEFT, via: null },
};

async function getBluetooth() {
  const svcActive = await sh(`systemctl is-active ${BLE_REC_SVC} 2>/dev/null`);
  if (svcActive.trim() !== 'active') {
    _btCache.right.connected = false; _btCache.right.via = null;
    _btCache.left.connected  = false; _btCache.left.via  = null;
    return _btSummary();
  }

  // Source of truth: the live SPP links the recorder holds via `rfcomm connect`.
  // `rfcomm` prints one line per node, e.g.
  //   rfcomm0: <ctrl> -> 04:26:04:16:0A:F3 channel 1 connected [...]
  // so a hand is connected iff its SPP MAC appears on a line containing
  // "connected".  This replaces the old BLE-log scraping (which never matched
  // the SPP recorder's log format and left the tab stuck on "disconnected").
  const rf = (await sh(`rfcomm 2>/dev/null`)).toLowerCase();
  const rfLines = rf.split('\n');
  for (const side of ['right', 'left']) {
    const mac = BT_GLOVES[side].toLowerCase();
    const conn = rfLines.some(l => l.includes(mac) && l.includes('connected'));
    _btCache[side].connected = conn;
    _btCache[side].via = conn ? 'spp' : null;
  }
  return _btSummary();
}

function _btSummary() {
  // Top-level shape keeps backward compat (single `connected` flag = either hand)
  // plus the per-side `gloves` map for the new UI.
  const r = _btCache.right, l = _btCache.left;
  return {
    connected: r.connected || l.connected,
    device:    r.connected ? r.device : (l.connected ? l.device : r.device),
    address:   r.connected ? r.address : (l.connected ? l.address : r.address),
    via:       (r.via || l.via) || null,
    gloves: {
      right: { ...r },
      left:  { ...l },
    },
  };
}

async function getCalibratorStatus() {
  const active = await sh(`systemctl is-active ${CAL_SVC} 2>/dev/null`);
  return { active: active === 'active', state: active };
}

async function getRecordingStats() {
  try {
    const entries = fs.readdirSync(RECORD_DIR);
    const recs = entries.filter(e => /^recording_/.test(e));
    let lastMtime = 0;
    let lastName  = '';
    for (const r of recs) {
      try {
        const st = fs.statSync(path.join(RECORD_DIR, r));
        if (st.mtimeMs > lastMtime) { lastMtime = st.mtimeMs; lastName = r; }
      } catch { /* skip */ }
    }
    return { count: recs.length, last: lastName, lastTime: lastMtime || null };
  } catch {
    return { count: 0, last: '', lastTime: null };
  }
}

// ── API handlers ──────────────────────────────────────────────────────────────

// TODO(v0.2): GET /api/status — 设备综合状态（电池/存储/WiFi/蓝牙/校准器/录制/有线手套）
async function apiStatus(req, res) {
  const [battery, storage, wifi, bluetooth, calibrator, recordings] = await Promise.all([
    getBattery(), getStorage(), getWifi(), getBluetooth(), getCalibratorStatus(), getRecordingStats(),
  ]);
  // Wired (USB-serial) gloves present per hand, by PID. The glove/calibration
  // tab uses this so a wired glove is shown connected + individually calibratable.
  const wiredGloves = getWiredGloves();

  // unified_capture camera status (if active)
  let captureStatus = null;
  if (await captureActive()) {
    try {
      const st = await captureCtl('status', 2000);
      if (st && st.ok) {
        captureStatus = {
          ready: !!st.ready, recording: !!st.running,
          cameras: st.cameras || {}, imu: !!st.imu,
          as5600: !!st.as5600, vive: !!st.vive,
        };
      }
    } catch {}
  }

  json(res, { battery, storage, wifi, bluetooth, wiredGloves, calibrator, recordings,
              captureStatus, ts: Date.now() });
}

// TODO(v0.2): GET /api/wifi/scan — 扫描 WiFi 网络列表
async function apiWifiScan(req, res) {
  const out = await sh('nmcli -t -f ACTIVE,SSID,SIGNAL,SECURITY dev wifi list 2>/dev/null', 10000);
  const networks = [];
  const seen = new Set();
  for (const line of out.split('\n')) {
    const parts = line.split(':');
    if (parts.length < 3) continue;
    const active   = parts[0] === 'yes';
    const ssid     = parts[1];
    const signal   = parseInt(parts[2], 10) || 0;
    const security = parts[3] || '';
    if (!ssid || seen.has(ssid)) continue;
    seen.add(ssid);
    networks.push({ ssid, signal, security, active });
  }
  networks.sort((a, b) => b.signal - a.signal);
  json(res, { networks });
}

// TODO(v0.2): POST /api/wifi/connect {ssid, password} — 连接 WiFi，禁止自动重连
async function apiWifiConnect(req, res) {
  const { ssid, password } = await readBody(req);
  if (!ssid) return json(res, { ok: false, error: 'missing ssid' }, 400);
  const q = JSON.stringify(ssid);
  // When a password is supplied, forget any stale saved profile for this SSID
  // first — otherwise nmcli silently reuses the old (possibly wrong) secret and
  // ignores the new password the user just typed.
  if (password) {
    await shFull(`nmcli -t -f NAME connection show 2>/dev/null | grep -Fxq ${q} && nmcli connection delete ${q}`, 8000);
  }
  const cmd = password
    ? `nmcli dev wifi connect ${q} password ${JSON.stringify(password)}`
    : `nmcli dev wifi connect ${q}`;
  const r = await shFull(cmd, 30000);
  const ok = r.code === 0 && /successfully activated/i.test(r.out);
  // Per product requirement: WiFi must NOT come back automatically after a
  // reboot. The customer connects manually each time. nmcli creates profiles
  // with autoconnect=yes by default, so turn it off on the profile we just
  // brought up (the current session stays connected; only future boots change).
  if (ok) {
    await shFull(`nmcli connection modify ${q} connection.autoconnect no`, 8000);
  }
  let error = '';
  if (!ok) {
    const msg = `${r.err} ${r.out}`.toLowerCase();
    if (/secrets were required|802-11-wireless-security|invalid password|not provided|incorrect/.test(msg)) {
      error = 'bad_password';
      // Drop the half-created profile so the next attempt starts clean.
      await shFull(`nmcli connection delete ${q} 2>/dev/null`, 6000);
    } else if (/no network with ssid|not found|timeout|timed out/.test(msg)) {
      error = 'not_found';
    } else {
      error = (r.err || r.out || 'failed').split('\n').pop();
    }
  }
  json(res, { ok, error, output: r.out || r.err });
}

// TODO(v0.2): POST /api/wifi/disconnect — 断开 WiFi
async function apiWifiDisconnect(req, res) {
  const out = await sh('nmcli dev disconnect wlan0 2>/dev/null || nmcli dev disconnect wlp1s0 2>/dev/null');
  json(res, { ok: true, output: out });
}

// Disable NetworkManager autoconnect on every saved WiFi profile so the board
// never silently rejoins a remembered network on power-up. Runs once at server
// startup; idempotent. The customer re-connects manually via the WiFi tab when
// they actually want WiFi (which re-activates the profile for that session).
async function disableAllWifiAutoconnect() {
  const list = await sh(
    `nmcli -t -f NAME,TYPE connection show 2>/dev/null`, 8000,
  );
  if (!list) return;
  for (const line of list.split('\n')) {
    // NAME may contain ':' — TYPE is the last field, so split from the right.
    const idx = line.lastIndexOf(':');
    if (idx < 0) continue;
    const name = line.slice(0, idx);
    const type = line.slice(idx + 1);
    if (!/wireless|wifi/i.test(type) || !name) continue;
    const q = JSON.stringify(name);
    await shFull(`nmcli connection modify ${q} connection.autoconnect no`, 8000);
  }
}

// TODO(v0.2): GET /api/bt/scan — 扫描蓝牙设备
async function apiBtScan(req, res) {
  // Use bleak (Python) – bluetoothctl scan on exits immediately non-interactively
  const scanPy = path.join(__dirname, 'scripts', 'bt_scan.py');
  const out = await sh(`python3 "${scanPy}" 7`, 14000);
  let devices = [];
  try { devices = JSON.parse(out || '[]'); } catch { /* parse error */ }
  const connectedMacs = new Set(
    Object.values(BT_GLOVES).map(m => m.toUpperCase()).filter((m, i) =>
      _btCache[Object.keys(BT_GLOVES)[i]].connected
    )
  );
  devices = devices.map(d => ({
    ...d,
    connected: connectedMacs.has(d.address.toUpperCase()),
    paired: false,
  }));
  devices.sort((a, b) => (b.connected ? 1 : 0) - (a.connected ? 1 : 0));
  json(res, { devices });
}

const BLE_REC_SVC = 'worldintel-ble-recorder';

// TODO(v0.2): POST /api/bt/connect {address} — 连接手套（启动 SPP recorder）
async function apiBtConnect(req, res) {
  const { address } = await readBody(req);
  if (!address) return json(res, { ok: false, error: 'missing address' }, 400);
  // Any known glove → (re)start the recorder service; it holds both SPP links
  // via `rfcomm connect`.  Success is confirmed from the live `rfcomm` state,
  // not log scraping — and we poll a few seconds because the link can take a
  // couple of connect retries to settle right after the glove powers on.
  const isKnownGlove = Object.values(BT_GLOVES)
    .some(m => m.toUpperCase() === address.toUpperCase());
  if (isKnownGlove) {
    // Self-heal: if a stale calibration session still owns the SPP link (e.g.
    // the kiosk page died mid-calibration and /api/calibrate/stop never ran),
    // the recorder's rfcomm connect would lose the race — SPP is single-
    // consumer.  Ask the calibrator to release both gloves first (no-op when
    // it holds nothing).
    for (const m of Object.values(BT_GLOVES)) {
      await sh(`curl -s -m 6 -X POST 'http://localhost:${CAL_PORT}/api/bluetooth/disconnect?mac=${m}' 2>/dev/null`, 8000);
    }
    await sh(`systemctl restart ${BLE_REC_SVC} 2>/dev/null`, 6000);
    const mac = address.toLowerCase();
    let ok = false;
    for (let i = 0; i < 8 && !ok; i++) {                 // up to ~12s
      await new Promise(r => setTimeout(r, 1500));
      const rf = (await sh(`rfcomm 2>/dev/null`)).toLowerCase();
      ok = rf.split('\n').some(l => l.includes(mac) && l.includes('connected'));
    }
    const side = Object.keys(BT_GLOVES).find(s => BT_GLOVES[s].toUpperCase() === address.toUpperCase());
    if (ok && side) { _btCache[side].connected = true; _btCache[side].via = 'spp'; }
    return json(res, { ok, output: ok ? 'connected via SPP' : 'connecting…' });
  }
  // BLE is intentionally disabled for the gloves.  HC-04 is single-consumer;
  // keeping BLE available here can steal the module from SPP and cause the
  // recorder/calibrator handoff to flap.
  json(res, { ok: false, output: 'BLE disabled; use SPP gloves only' }, 400);
}

// TODO(v0.2): POST /api/bt/disconnect — 断开所有手套（停止 recorder）
async function apiBtDisconnect(req, res) {
  // Stop the recorder service so it stops auto-reconnecting
  await sh(`systemctl stop ${BLE_REC_SVC} 2>/dev/null`, 5000);
  await sh(`pkill -f 'ble_bridge.py' 2>/dev/null`);
  _btCache.connected = false;
  _btCache.via = null;
  json(res, { ok: true });
}

// ── unified_capture file scanning ────────────────────────────────────────
// Maps the unified_capture session_NNN directory tree to the Recording type
// that the frontend expects (same fields as the old recording_* scanner).
const CAPTURE_DATA_DIR = process.env.CAPTURE_DATA_DIR || '/data/capture';

function scanCaptureSessions(ext) {
  const files = [];
  let entries = [];
  try { entries = fs.readdirSync(CAPTURE_DATA_DIR); } catch { return files; }

  for (const name of entries) {
    if (!name.startsWith('session_')) continue;
    const sp = path.join(CAPTURE_DATA_DIR, name);
    let st;
    try { st = fs.statSync(sp); } catch { continue; }
    if (!st.isDirectory()) continue;

    // Total size (du -sk equivalent)
    let totalSize = 0;
    (function du(dir) {
      try {
        for (const f of fs.readdirSync(dir)) {
          const fp = path.join(dir, f);
          const s = fs.statSync(fp);
          if (s.isDirectory()) du(fp);
          else totalSize += s.size;
        }
      } catch {}
    })(sp);

    // Detect content from subdirectories
    let subDirs = [];
    try { subDirs = fs.readdirSync(sp).filter(f => {
      try { return fs.statSync(path.join(sp, f)).isDirectory(); } catch { return false; }
    }); } catch {}

    // color = any .mkv in any camera subdir
    const hasColor = subDirs.some(d => {
      try { return fs.readdirSync(path.join(sp, d)).some(f => f.endsWith('.mkv')); }
      catch { return false; }
    });
    // IMU = any *_imu.jsonl in any subdir
    const hasImu = subDirs.some(d => {
      try { return fs.readdirSync(path.join(sp, d)).some(f => f.endsWith('_imu.jsonl')); }
      catch { return false; }
    });
    // AS5600 encoder data
    const topFiles = (() => {
      try { return fs.readdirSync(sp).filter(f => {
        try { return fs.statSync(path.join(sp, f)).isFile(); } catch { return false; }
      }); } catch { return []; }
    })();
    const hasEncoder = topFiles.includes('encoder.jsonl');
    const hasTracker = topFiles.includes('tracker.jsonl');

    // Transfer state
    let transferring = false, transferred = false, transferPct = 0;
    if (ext) {
      const tj = _transferring.get(name);
      if (tj) {
        transferring = true;
        const done = (() => { let n = 0;
          try { (function d(dir) { for (const f of fs.readdirSync(dir)) { const fp = path.join(dir, f); if (fs.statSync(fp).isDirectory()) d(fp); else n += fs.statSync(fp).size; } })(tj.dstDir); } catch {}
          return n;
        })();
        transferPct = tj.srcBytes > 0 ? Math.min(99, Math.round(done * 100 / tj.srcBytes)) : 0;
      } else {
        transferred = dirTransferred(sp, path.join(ext.mount, 'records', name));
      }
    }

    // unified_capture always has decoded IMU (JSONL inline) — no post-processing needed
    files.push({
      name, size: totalSize, mtime: st.mtimeMs,
      hasColor, hasDepth: false, hasGlove: false, hasImu,
      hasStereo: hasColor, hasAudio: false,
      decoded: true, decoding: false, needsDecode: false,
      transferring, transferred, transferPct,
      // extra fields for future use
      hasEncoder, hasTracker, cameraCount: subDirs.length,
    });
  }
  files.sort((a, b) => b.mtime - a.mtime);
  return files;
}

// TODO(v0.2): GET /api/files — 列出所有录制文件及外部磁盘状态
async function apiFiles(req, res) {
  // unified_capture: scan session_NNN directories
  if (await captureActive()) {
    try {
      const ext = getExternalDisk();
      const files = scanCaptureSessions(ext);
      let externalDisk = null;
      if (ext) {
        let free = 0, total = 0;
        try { const s = fs.statfsSync(ext.mount); free = s.bavail * s.bsize; total = s.blocks * s.bsize; } catch {}
        externalDisk = { present: true, mount: ext.mount, dev: ext.dev, free, total };
      }
      return json(res, { files, root: CAPTURE_DATA_DIR, externalDisk });
    } catch (e) {
      return json(res, { files: [], root: CAPTURE_DATA_DIR, externalDisk: null, error: e.message });
    }
  }

  try {
    const entries = fs.readdirSync(RECORD_DIR);
    const ext = getExternalDisk();
    const files = [];
    for (const name of entries) {
      if (!name.startsWith('recording_')) continue;
      try {
        const fp = path.join(RECORD_DIR, name);
        const st = fs.statSync(fp);
        if (!st.isDirectory()) continue;
        const sizeOut = await sh(`du -sk ${JSON.stringify(fp)} 2>/dev/null`);
        const sz = parseInt((sizeOut.split('\t')[0] || '0'), 10) * 1024;
        const sub = fs.readdirSync(fp).map(f => f.toLowerCase());
        const hasColor = sub.some(f => f.startsWith('color') && f.endsWith('.mkv'));
        const hasDepth = sub.some(f => f.startsWith('depth') && f.endsWith('.mkv'));
        // Dual-glove SPP recordings live in glove_left/ + glove_right/ (older
        // single-glove ones used glove/).  Any of them with a .bin counts.
        const hasGlove = ['glove', 'glove_left', 'glove_right'].some(g => {
          if (!sub.includes(g)) return false;
          try { return fs.readdirSync(path.join(fp, g)).some(f => f.endsWith('.bin')); }
          catch { return false; }
        });
        const hasImu = sub.includes('imu');
        // Stereo (DECXIN) recordings keep their data in a `stereo/` subdir:
        // stereo_000000.mkv is the raw 60fps master; *_imu.csv exists only once
        // the in-frame IMU has been decoded. "needsDecode" drives the Files-tab
        // Decode button for clips captured with post-process OFF.
        let hasStereo = false, decoded = false, hasAudio = false;
        try {
          const sents = fs.readdirSync(path.join(fp, 'stereo'));
          hasStereo = sents.some(f => f.toLowerCase().endsWith('.mkv'));
          decoded   = sents.some(f => /_imu\.csv$/i.test(f));
          hasAudio  = sents.some(f => /^audio.*\.wav$/i.test(f));
        } catch { /* no stereo subdir */ }
        // also catch audio recorded at the recording root (non-stereo layouts)
        if (!hasAudio) hasAudio = sub.some(f => /^audio.*\.wav$/.test(f));
        const decoding = _decoding.has(name);
        const needsDecode = hasStereo && !decoded && !decoding;
        // External-drive transfer state for the Files-tab Transfer button.
        let transferring = false, transferred = false, transferPct = 0;
        if (ext) {
          const tj = _transferring.get(name);
          if (tj) {
            transferring = true;
            const done = dirBytes(tj.dstDir);
            transferPct = tj.srcBytes > 0
              ? Math.min(99, Math.round(done * 100 / tj.srcBytes)) : 0;
          } else {
            transferred = dirTransferred(fp, path.join(ext.mount, 'records', name));
          }
        }
        files.push({ name, size: sz, mtime: st.mtimeMs, isDir: true,
                     hasColor, hasDepth, hasGlove, hasImu,
                     hasStereo, hasAudio, decoded, decoding, needsDecode,
                     transferring, transferred, transferPct });
      } catch { /* skip */ }
    }
    files.sort((a, b) => b.mtime - a.mtime);
    let externalDisk = null;
    if (ext) {
      // free space on the drive so the UI can warn before a doomed transfer
      let free = 0, total = 0;
      try {
        const s = fs.statfsSync(ext.mount);
        free = s.bavail * s.bsize; total = s.blocks * s.bsize;
      } catch { /* statfs unsupported → sizes stay 0 */ }
      externalDisk = { present: true, mount: ext.mount, dev: ext.dev, free, total };
    }
    json(res, { files, root: RECORD_DIR, externalDisk });
  } catch (e) {
    json(res, { files: [], root: RECORD_DIR, externalDisk: null, error: e.message });
  }
}

// TODO(v0.2): DELETE /api/files/:name — 删除指定录制
async function apiFilesDelete(req, res, name) {
  if (!name || name.includes('..') || name.includes('/')) {
    return json(res, { ok: false, error: 'invalid name' }, 400);
  }
  const baseDir = (await captureActive()) ? CAPTURE_DATA_DIR : RECORD_DIR;
  const fp = path.join(baseDir, name);
  const out = await sh(`rm -rf ${JSON.stringify(fp)} 2>/dev/null && echo ok`);
  json(res, { ok: out.trim() === 'ok' });
}

// ── On-demand decode (post-process) ────────────────────────────────────────
// Recordings captured with post-process OFF keep only the raw 60fps master; the
// in-frame ICM42688 IMU is intact and can be decoded later. This runs
// stereo_postprocess_device.py on a recording's stereo/ dir in the background.
// _decoding tracks the in-flight jobs so the Files tab can show "decoding…".
const _decoding = new Map(); // recName → child process
const SCRIPTS_DIR = path.join(__dirname, 'scripts');

// TODO(v0.2): POST /api/recordings/:name/decode — 按需解码 IMU（后处理）
async function apiDecode(req, res, recName) {
  if (!recName || recName.includes('..') || recName.includes('/')) {
    return json(res, { ok: false, error: 'invalid name' }, 400);
  }
  // unified_capture: IMU is always decoded (JSONL inline), no post-processing
  if (await captureActive()) {
    return json(res, { ok: true, alreadyDecoded: true });
  }
  const recDir = path.join(RECORD_DIR, recName);
  const stereoDir = path.join(recDir, 'stereo');
  if (!fs.existsSync(stereoDir)) {
    return json(res, { ok: false, error: 'no_stereo' }, 404);
  }
  if (_decoding.has(recName)) {
    return json(res, { ok: false, error: 'busy', status: 'decoding' }, 409);
  }
  const ppy = path.join(SCRIPTS_DIR, 'stereo_postprocess_device.py');
  if (!fs.existsSync(ppy)) {
    return json(res, { ok: false, error: 'postprocess_missing' }, 500);
  }
  // Clear any skip marker so this recording is treated as decode-on-demand.
  try { fs.unlinkSync(path.join(recDir, '.skip_postprocess')); } catch {}
  let logf;
  try { logf = fs.openSync(path.join(stereoDir, 'postprocess.log'), 'a'); }
  catch { logf = 'ignore'; }
  let proc;
  try {
    proc = spawn('python3', [ppy, stereoDir, '--imu'],
      { stdio: ['ignore', logf, logf] });
  } catch (e) {
    if (typeof logf === 'number') { try { fs.closeSync(logf); } catch {} }
    return json(res, { ok: false, error: e.message }, 500);
  }
  _decoding.set(recName, proc);
  const done = () => {
    _decoding.delete(recName);
    if (typeof logf === 'number') { try { fs.closeSync(logf); } catch {} }
  };
  proc.on('close', done);
  proc.on('error', done);
  json(res, { ok: true, status: 'started' });
}

// ── External USB drive + transfer ──────────────────────────────────────────
// Detect an *external* USB drive (sd* whose sysfs device path goes through
// /usb) that is mounted read-write.  The onboard eMMC/NVMe never matches sd*
// via USB, so this can't false-positive on internal storage.  The desktop
// session auto-mounts USB partitions under /media/<user>/<label>.
function getExternalDisk() {
  let usbDevs = [];
  try {
    usbDevs = fs.readdirSync('/sys/block')
      .filter(n => /^sd[a-z]$/.test(n))
      .filter(n => {
        try { return fs.realpathSync(`/sys/block/${n}/device`).includes('/usb'); }
        catch { return false; }
      });
  } catch { /* no /sys/block */ }
  if (!usbDevs.length) return null;
  let mounts = '';
  try { mounts = fs.readFileSync('/proc/mounts', 'utf8'); } catch { return null; }
  for (const line of mounts.split('\n')) {
    const [dev, mp] = line.split(' ');
    if (!dev || !dev.startsWith('/dev/sd') || !mp) continue;
    const base = dev.slice('/dev/'.length).replace(/\d+$/, '');
    if (!usbDevs.includes(base)) continue;
    const mount = mp.replace(/\\040/g, ' ');
    try { fs.accessSync(mount, fs.constants.W_OK); } catch { continue; }
    return { dev, mount };
  }
  return null;
}

// Recursively sum file sizes (cheap stat walk, no data reads)
function dirBytes(dir) {
  let total = 0;
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return 0; }
  for (const e of ents) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) total += dirBytes(fp);
    else if (e.isFile()) { try { total += fs.statSync(fp).size; } catch {} }
  }
  return total;
}

// A recording counts as "transferred" when every local file exists at the
// destination with the exact same byte size.
function dirTransferred(src, dst) {
  let ents;
  try { ents = fs.readdirSync(src, { withFileTypes: true }); } catch { return false; }
  for (const e of ents) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) {
      if (!dirTransferred(s, d)) return false;
    } else if (e.isFile()) {
      try {
        if (fs.statSync(d).size !== fs.statSync(s).size) return false;
      } catch { return false; }
    }
  }
  return true;
}

// In-flight transfers: recName → { proc, srcBytes, dstDir, error }
// Local data is NEVER deleted after a transfer — the user deletes manually
// from the Files tab when they choose to.
const _transferring = new Map();

// TODO(v0.2): POST /api/recordings/:name/transfer — 传输到外部 USB 磁盘（不删本地）
async function apiTransfer(req, res, recName) {
  if (!recName || recName.includes('..') || recName.includes('/')) {
    return json(res, { ok: false, error: 'invalid name' }, 400);
  }
  const baseDir = (await captureActive()) ? CAPTURE_DATA_DIR : RECORD_DIR;
  const srcDir = path.join(baseDir, recName);
  if (!fs.existsSync(srcDir)) return json(res, { ok: false, error: 'not_found' }, 404);
  const ext = getExternalDisk();
  if (!ext) return json(res, { ok: false, error: 'no_disk' }, 404);
  if (_transferring.has(recName)) {
    return json(res, { ok: false, error: 'busy', status: 'transferring' }, 409);
  }
  const dstRoot = path.join(ext.mount, 'records');
  const dstDir = path.join(dstRoot, recName);
  try { fs.mkdirSync(dstDir, { recursive: true }); }
  catch (e) { return json(res, { ok: false, error: 'mkdir: ' + e.message }, 500); }
  const srcBytes = dirBytes(srcDir);
  // cp then sync so "done" means the data is really on the disk, not in the
  // page cache — the user may yank the enclosure right after the UI updates.
  const cmd = `cp -r ${JSON.stringify(srcDir + '/.')} ${JSON.stringify(dstDir + '/')} && sync ${JSON.stringify(dstDir)} 2>/dev/null || sync`;
  let proc;
  try { proc = spawn('sh', ['-c', cmd], { stdio: 'ignore' }); }
  catch (e) { return json(res, { ok: false, error: e.message }, 500); }
  const st = { proc, srcBytes, dstDir, error: null };
  _transferring.set(recName, st);
  proc.on('close', (code) => {
    if (code === 0 && dirTransferred(srcDir, dstDir)) {
      console.log(`[transfer] ${recName} → ${dstDir} done (${srcBytes} bytes)`);
    } else {
      console.warn(`[transfer] ${recName} FAILED (exit ${code})`);
    }
    _transferring.delete(recName);
  });
  proc.on('error', () => { _transferring.delete(recName); });
  json(res, { ok: true, status: 'started' });
}

// Generate and cache a small H.264 preview clip for Chromium playback
const _previewCache = new Map(); // name → { path, ready, callbacks }
// TODO(v0.2): GET /api/recordings/:name/preview — 生成 H.264 预览片段供 <video> 播放
function apiPreview(req, res, recName) {
  if (!recName || recName.includes('..') || recName.includes('/')) {
    return json(res, { error: 'invalid name' }, 400);
  }
  const srcDir = path.join(RECORD_DIR, recName);
  // Find color MKV
  let srcFile;
  try {
    const ents = fs.readdirSync(srcDir);
    const c = ents.find(e => /^color.*\.mkv$/i.test(e));
    if (!c) return json(res, { error: 'no color video' }, 404);
    srcFile = path.join(srcDir, c);
  } catch { return json(res, { error: 'recording not found' }, 404); }

  const safe = recName.replace(/[^a-z0-9_-]/gi, '_');
  const outPath = `/tmp/preview_${safe}.mp4`;

  // Already cached
  if (fs.existsSync(outPath)) {
    return streamFile(res, outPath, 'video/mp4');
  }

  // Already generating — queue response
  if (_previewCache.has(recName)) {
    _previewCache.get(recName).push(() => streamFile(res, outPath, 'video/mp4'));
    return;
  }
  _previewCache.set(recName, []);

  // Transcode: first 40s, 480px wide, H.264 hw-accel if available
  const cmd = [
    'ffmpeg', '-y', '-t', '40',
    '-i', srcFile,
    '-vf', 'scale=480:-2',
    '-c:v', 'h264_v4l2m2m', '-b:v', '600k',
    '-an', '-movflags', '+faststart',
    outPath,
  ];
  const proc = spawn(cmd[0], cmd.slice(1), { stdio: 'ignore' });
  proc.on('close', (code) => {
    if (code !== 0) {
      // Fallback to software encoder
      const cmd2 = ['ffmpeg', '-y', '-t', '40', '-i', srcFile,
        '-vf', 'scale=480:-2', '-c:v', 'libx264', '-preset', 'ultrafast',
        '-crf', '32', '-an', '-movflags', '+faststart', outPath];
      const p2 = spawn(cmd2[0], cmd2.slice(1), { stdio: 'ignore' });
      p2.on('close', () => {
        streamFile(res, outPath, 'video/mp4');
        (_previewCache.get(recName) || []).forEach(cb => cb());
        _previewCache.delete(recName);
      });
      return;
    }
    streamFile(res, outPath, 'video/mp4');
    (_previewCache.get(recName) || []).forEach(cb => cb());
    _previewCache.delete(recName);
  });
}

function streamFile(res, fp, mime) {
  let st;
  try { st = fs.statSync(fp); } catch { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': mime, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' });
  fs.createReadStream(fp).pipe(res);
}

// Stream a file from a recording dir (for in-browser playback / download)
// TODO(v0.2): GET /api/recordings/:name/:fileName — 流式传输录制目录内任意文件（支持 Range 分段）
async function apiRecordingFile(req, res, recName, fileName) {
  if (!recName || recName.includes('..') || recName.includes('/') ||
      !fileName || fileName.includes('..')) {
    return json(res, { error: 'invalid path' }, 400);
  }
  const baseDir = (await captureActive()) ? CAPTURE_DATA_DIR : RECORD_DIR;
  const fp = path.join(baseDir, recName, fileName);
  let st;
  try { st = fs.statSync(fp); } catch { return json(res, { error: 'not found' }, 404); }
  const ext = path.extname(fileName).toLowerCase();
  const mime = { '.mkv': 'video/x-matroska', '.mp4': 'video/mp4',
                 '.wav': 'audio/wav', '.json': 'application/json',
                 '.jsonl': 'application/json', '.csv': 'text/csv',
                 '.bin': 'application/octet-stream', '.log': 'text/plain' }[ext] || 'application/octet-stream';
  const total = st.size;
  const rangeHeader = req.headers['range'];
  if (rangeHeader) {
    const [, s, e] = /bytes=(\d*)-(\d*)/.exec(rangeHeader) || [];
    const start = s ? parseInt(s, 10) : 0;
    const end   = e ? parseInt(e, 10) : total - 1;
    const chunk = end - start + 1;
    res.writeHead(206, {
      'Content-Type': mime, 'Content-Length': chunk,
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(fp, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': mime, 'Content-Length': total, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(fp).pipe(res);
  }
}

// ── Calibration mode ──────────────────────────────────────────────────────────
// The glove HC-04 exposes one useful data path for production: Classic SPP.
// During normal operation the recorder owns the held rfcomm links.  For
// calibration on the computer browser (:8888) we hand the selected glove over
// to the calibrator, which also connects via SPP and exposes /dev/rfcommN as a
// virtual serial port to its GloveReader.
//
// Flow:
//   1. Stop the SPP recorder service so it releases /dev/rfcomm0/1
//   2. Tell the calibrator to connect via SPP (transport=spp)
//   3. On stop: disconnect on the calibrator, restart the recorder.

// TODO(v0.2): POST /api/calibrate/start {side, transport} — 启动校准（SPP/有线手套 → 校准器服务）
async function apiCalibrateStart(req, res) {
  const body = await readBody(req);
  const side = (body.side === 'left') ? 'left' : 'right';
  const transport = String(body.transport || 'spp').toLowerCase();
  const mac  = BT_GLOVES[side];

  // Wired glove: the calibrator reads /dev/ttyACM directly (auto-detected by
  // PID) — no rfcomm/SPP handoff needed.  Just make sure the calibrator is up
  // and stop the wired recorder so it can't contend for the tty mid-calibration.
  if (transport === 'wired') {
    await sh(`systemctl stop ${WIRED_REC_SVC} 2>/dev/null`, 6000);
    await sh(`systemctl start ${CAL_SVC} 2>/dev/null`, 8000);
    return json(res, { ok: true, side, transport: 'wired' });
  }

  // 1. Stop our recorder so it stops spawning its own bridges.
  await sh(`systemctl stop ${BLE_REC_SVC} 2>/dev/null`, 6000);
  _btCache.right.connected = false;
  _btCache.left.connected  = false;

  // 2. Tell the calibrator to drop any stale virtual port for this glove.
  await sh(`curl -s -m 8 -X POST 'http://localhost:${CAL_PORT}/api/bluetooth/disconnect?mac=${mac}' 2>/dev/null`, 9000);

  // 3. Release the side-specific rfcomm node; the recorder uses
  // right=rfcomm0, left=rfcomm1.  The calibrator may then allocate it.
  await sh(`rfcomm release ${side === 'left' ? 1 : 0} 2>/dev/null`, 5000);

  // 4. Remove stale drop-in if present.
  await sh(`rm -f /etc/systemd/system/${CAL_SVC}.d/cal-pty.conf 2>/dev/null; systemctl daemon-reload 2>/dev/null`, 5000);

  // 5. Let BlueZ settle.
  await new Promise(r => setTimeout(r, 1500));

  // 6. Connect — SPP only.
  const out = await sh(
    `curl -s -m 25 -X POST ` +
    `'http://localhost:${CAL_PORT}/api/bluetooth/connect?mac=${mac}&transport=spp&side=${side}'`,
    28000
  );

  let resp = {};
  try { resp = JSON.parse(out.trim() || '{}'); } catch (_) {}

  if (resp.ok === false || (resp.path == null && resp.ok !== true)) {
    await sh(`systemctl start ${BLE_REC_SVC} 2>/dev/null`, 5000);
    return json(res, { ok: false, error: resp.reason || 'calibrator could not connect to glove (is it powered on and nearby?)' });
  }

  json(res, { ok: true, side, path: resp.path || null });
}

// TODO(v0.2): POST /api/calibrate/stop {side, transport} — 停止校准，恢复 recorder
async function apiCalibrateStop(req, res) {
  const body = await readBody(req);
  const side = (body.side === 'left') ? 'left' : 'right';
  const transport = String(body.transport || 'spp').toLowerCase();
  const mac  = BT_GLOVES[side];

  // Wired: just bring the wired recorder back; nothing to disconnect.
  if (transport === 'wired') {
    await sh(`systemctl start ${WIRED_REC_SVC} 2>/dev/null`, 5000);
    return json(res, { ok: true });
  }

  await sh(
    `curl -s -m 15 -X POST ` +
    `'http://localhost:${CAL_PORT}/api/bluetooth/disconnect?mac=${mac}'`,
    18000
  );
  await new Promise(r => setTimeout(r, 1500));
  await sh(`systemctl start ${BLE_REC_SVC} 2>/dev/null`, 5000);
  json(res, { ok: true });
}

// ── Recording control ─────────────────────────────────────────────────────────

const ORBBEC_USB_ID = '2bc5';  // Orbbec USB vendor ID
const TRIGGER_PY    = path.join(__dirname, 'scripts', 'trigger_record.py');
const CAM_FRAME_SH  = path.join(__dirname, 'scripts', 'camera_frame.sh');
const PREVIEW_FILE  = '/tmp/camera_preview.jpg';

// ── Stereo (UVC) camera integration ──────────────────────────────────────
// The Nori/Xvision "DECXIN" stereo camera is a standard UVC device owned by the
// worldintel-stereo-recorder daemon (it holds /dev/video0 and serves record /
// status / preview over an AF_UNIX control socket). The Orbbec is NOT a V4L2
// device and is driven by guidaview. We treat the stereo cam as the "active"
// camera only when the Orbbec is unplugged, so the same UI works either way.
const STEREO_USB_ID   = '1bcf:2d50';
const STEREO_CTL_SOCK = process.env.STEREO_CTL_SOCK || '/tmp/stereo_ctl.sock';

// Talk to the stereo daemon over its control socket. Going straight to the
// socket (vs spawning the python client) is cheap and, crucially, does NOT
// open /dev/video0 itself - so it never fights the daemon for the device and
// never disturbs its LED / camera-present state.
function stereoCtl(cmd, timeoutMs = 8000) {
  return new Promise((resolve) => {
    let done = false, buf = '';
    const finish = (o) => { if (!done) { done = true; resolve(o); } };
    const c = net.connect(STEREO_CTL_SOCK);
    const to = setTimeout(() => { try { c.destroy(); } catch {} finish({ ok: false, error: 'timeout' }); }, timeoutMs);
    c.on('connect', () => c.write(cmd + '\n'));
    c.on('data', (d) => { buf += d.toString(); });
    c.on('end', () => { clearTimeout(to); try { finish(JSON.parse(buf.trim())); } catch { finish({ ok: false, error: 'parse', raw: buf }); } });
    c.on('error', (e) => { clearTimeout(to); finish({ ok: false, error: 'unreachable:' + e.message }); });
  });
}

// ── unified_capture integration ─────────────────────────────────────────
// Talk to the unified_capture daemon over its control socket. Same short-
// connection pattern as stereoCtl, so we never hold the socket open and
// never create extra threads (critical: TSTC/MPP break on extra pthreads).
const CAPTURE_SOCK = '/tmp/unified_capture.sock';

function captureCtl(cmd, timeoutMs = 12000) {
  return new Promise((resolve) => {
    let done = false, buf = '';
    const finish = (o) => { if (!done) { done = true; resolve(o); } };
    const c = net.connect(CAPTURE_SOCK);
    const to = setTimeout(() => { try { c.destroy(); } catch {} finish({ ok: false, error: 'timeout' }); }, timeoutMs);
    c.on('connect', () => c.write(cmd + '\n'));
    c.on('data', (d) => { buf += d.toString(); });
    c.on('end', () => { clearTimeout(to); try { finish(JSON.parse(buf.trim())); } catch { finish({ ok: false, error: 'parse', raw: buf }); } });
    c.on('error', (e) => { clearTimeout(to); finish({ ok: false, error: 'unreachable' }); });
  });
}

// True when unified_capture is the active camera backend (its socket is up
// and responding). This is mutually exclusive with stereoActive() — the two
// backends share the same set of USB devices and cannot run simultaneously.
let _captureCache = { ts: 0, active: false };
async function captureActive() {
  const now = Date.now();
  if (now - _captureCache.ts < 3000) return _captureCache.active;
  try {
    const r = await captureCtl('status', 2000);
    _captureCache = { ts: now, active: !!(r && r.ok) };
  } catch { _captureCache = { ts: now, active: false }; }
  return _captureCache.active;
}

// External USB microphone presence. Mirrors stereo_cam_record.py's _find_usb_mic
// so the record tab shows a mic exactly when the recorder would capture audio:
// only USB-Audio capture cards count (the onboard codec is ignored).
async function detectUsbMic() {
  const out = await sh(`cat /proc/asound/cards 2>/dev/null`);
  if (!out) return { connected: false, name: '' };
  for (const line of out.split('\n')) {
    const m = line.match(/^\s*(\d+)\s*\[[^\]]*\]:\s*(.*)$/);
    if (!m) continue;
    const idx = m[1], desc = (m[2] || '').trim();
    if (!/usb/i.test(desc)) continue;
    const cap = await sh(`ls /proc/asound/card${idx}/pcm*c 2>/dev/null | head -1`);
    if (cap.trim()) return { connected: true, name: desc };
  }
  return { connected: false, name: '' };
}

// True when the stereo cam should drive the record UI (Orbbec absent + stereo present).
async function stereoActive() {
  const [orb, ste] = await Promise.all([
    sh(`lsusb 2>/dev/null | grep -i '${ORBBEC_USB_ID}'`),
    sh(`lsusb 2>/dev/null | grep -i '${STEREO_USB_ID}'`),
  ]);
  return !orb.trim() && !!ste.trim();
}

// The Orbbec camera only delivers frames while guidaview is recording, so a
// "live preview" (for the worker to aim the camera before the real capture) is
// implemented as a throwaway guidaview recording that we scrape frames from and
// delete when done. _previewDir holds that disposable recording's path.
let _previewDir = null;
let _recBusy    = false;   // serialize toggle/preview operations
let _stereoPreview = false; // stereo "aim" live-preview armed (no throwaway rec)

function pressRecordButton() {
  // guidaview treats a Volume-Up press as a start/stop toggle.
  return sh(`python3 "${TRIGGER_PY}" 2>&1`, 5000).then(o => o.trim());
}

// Ground truth for "is recording": a color_*.mkv touched within the last few
// seconds means guidaview is actively writing. This is stable (no race) unlike
// the previous "-newer <now>" check that flickered the UI between start/stop.
// NOTE: RECORD_DIR (/mnt/ums/records) is a SYMLINK to /mnt/record/records, and
// `find` does not descend into a symlinked start point without -L. Missing -L
// made this always return false, so Orbbec "start preview" never detected the
// throwaway recording (it timed out and fell into a bare recording instead).
async function isPhysicallyRecording() {
  // A color_*.mkv touched within the last few seconds means guidaview is
  // actively writing. We bound the match on BOTH sides: newer than 4s ago AND
  // not in the future (mtime <= now + 5s). The upper bound is a guard against a
  // backwards clock jump (dead RTC / no NTP reverts the board to its build date):
  // without it, every existing recording's mkv looks "newer" than the ref file,
  // so the check would latch true forever and the UI would stick on "recording".
  const out = await sh(
    `touch -d '-4 seconds' /tmp/.rec_ref 2>/dev/null; ` +
    `touch -d '+5 seconds'  /tmp/.rec_future 2>/dev/null; ` +
    `find -L ${RECORD_DIR} -maxdepth 2 -name 'color_*.mkv' ` +
    `-newer /tmp/.rec_ref ! -newer /tmp/.rec_future 2>/dev/null | head -1`,
    3000);
  return !!out.trim();
}

async function newestRecordingDir() {
  return (await sh(`ls -1dt ${RECORD_DIR}/recording_* 2>/dev/null | head -1`)).trim();
}

async function waitFor(predicate, tries = 12, gapMs = 700) {
  for (let i = 0; i < tries; i++) {
    await new Promise(r => setTimeout(r, gapMs));
    if (await predicate()) return true;
  }
  return false;
}

async function getRecordStatus() {
  const [journalOut, usbOut, physical, mic] = await Promise.all([
    sh(`journalctl -u guidaview -n 30 --no-pager 2>/dev/null`),
    sh(`lsusb 2>/dev/null | grep -i '${ORBBEC_USB_ID}'`),
    isPhysicallyRecording(),
    detectUsbMic(),
  ]);

  let cameraConnected = !!usbOut.trim();
  let guidaviewReady = false;  // in "waiting for button" state
  if (journalOut) {
    const lines = journalOut.split('\n').filter(l => l.trim());
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      if (l.includes('Waiting for key press') || l.includes('Press Volume Up') || l.includes('ready state')) {
        guidaviewReady = true; cameraConnected = true; break;
      }
      if (l.includes('[REC]') || l.includes('Recording Session')) { cameraConnected = true; break; }
      if (l.includes('No camera') || l.includes('no camera') ||
          l.includes('SSD export') || l.includes('external USB SSD')) {
        cameraConnected = false; guidaviewReady = false; break;
      }
    }
  }

  // Reconcile preview state: if guidaview is no longer recording, the preview ended.
  if (!physical) _previewDir = null;
  const previewing = physical && !!_previewDir;
  const recording  = physical && !_previewDir;

  let currentDir = '';
  if (recording) currentDir = (await newestRecordingDir()).split('/').pop() || '';

  // Glove connection per hand = Bluetooth SPP link live OR a wired USB glove
  // present.  A hand counts as connected if EITHER transport has it, so the
  // record tab shows "left / right / both connected" regardless of how the
  // glove is attached.
  const btSides = { left: false, right: false };
  const bleActive = await sh(`systemctl is-active ${BLE_REC_SVC} 2>/dev/null`);
  if (bleActive.trim() === 'active') {
    const rf = (await sh(`rfcomm 2>/dev/null`)).toLowerCase();
    for (const side of ['left', 'right']) {
      btSides[side] = rf.split('\n').some(l =>
        l.includes(BT_GLOVES[side].toLowerCase()) && l.includes('connected'));
    }
  }
  const wiredSides = getWiredGloves();
  const gloveSides = {
    left:  btSides.left  || wiredSides.left,
    right: btSides.right || wiredSides.right,
  };
  const gloveConnected = gloveSides.left || gloveSides.right;

  // unified_capture: the capture daemon owns camera state (guidaview /
  // stereo daemon are not running when unified_capture is active, since
  // they share the same USB devices). Glove / mic detection stay the same.
  if (await captureActive()) {
    const st = await captureCtl('status', 3000);
    const sCam = !!(st && st.ok && st.ready);
    const sRec = !!(st && st.ok && st.running);
    return {
      cameraConnected: sCam, cameraType: 'stereo', gloveConnected, gloveSides,
      micConnected: mic.connected, micName: mic.name,
      recording: sRec, previewing: sCam && !sRec && _stereoPreview,
      guidaviewReady: sCam && !sRec,
      currentDir: (st && st.session) || '', stereo: true,
      // unified_capture extensions (non-breaking for frontend)
      cameras: (st && st.cameras) || {},
      imu: !!(st && st.imu), as5600: !!(st && st.as5600), vive: !!(st && st.vive),
    };
  }

  // When the stereo cam is the active camera, its daemon is the source of
  // truth for camera-present / recording state (guidaview is idle without the
  // Orbbec). Gloves still apply, so we keep the glove fields computed above.
  // Note: previewing is intentionally false for stereo - a UVC cam streams on
  // demand, so we never run the throwaway "live preview" loop (which would keep
  // grabbing /dev/video0 and fight the daemon, dropping its ready LED).
  if (await stereoActive()) {
    const st = await stereoCtl('status');
    const sRec = !!st.recording;
    const sCam = !!st.camera_present;
    return {
      cameraConnected: sCam, cameraType: 'stereo', gloveConnected, gloveSides,
      micConnected: mic.connected, micName: mic.name,
      recording: sRec, previewing: sCam && !sRec && _stereoPreview,
      guidaviewReady: sCam && !sRec,
      currentDir: st.rec || '', stereo: true,
    };
  }

  return { cameraConnected, cameraType: cameraConnected ? 'depth' : null, gloveConnected, gloveSides, micConnected: mic.connected, micName: mic.name, recording, previewing, guidaviewReady, currentDir };
}

// TODO(v0.2): GET /api/record/status — 录制状态（相机/手套/麦克风/预览/录制中）
async function apiRecordStatus(req, res) {
  json(res, await getRecordStatus());
}

// Start a disposable live preview so the worker can aim the camera.
// TODO(v0.2): POST /api/camera/live/start — 开始实时预览（Orbbec=丢弃录制 / Stereo=标记预览态）
async function apiLiveStart(req, res) {
  // unified_capture: arm the preview flag; the UI then polls /api/camera/preview
  // which requests a JPEG frame from the capture daemon on demand.
  if (await captureActive()) { _stereoPreview = true; return json(res, { ok: true, capture: true }); }
  // Stereo cam streams on demand, so no throwaway recording is needed - just
  // arm the preview flag; the UI then polls /api/camera/preview, which serves a
  // live frame straight from the daemon (the daemon owns /dev/video0).
  if (await stereoActive()) { _stereoPreview = true; return json(res, { ok: true, stereo: true }); }
  if (_recBusy) return json(res, { ok: false, busy: true });
  _recBusy = true;
  try {
    if (await isPhysicallyRecording()) return json(res, { ok: true, alreadyRecording: true });
    const before = await newestRecordingDir();
    await pressRecordButton();
    const started = await waitFor(async () => {
      if (!await isPhysicallyRecording()) return false;
      const d = await newestRecordingDir();
      return d && d !== before;
    }, 14, 700);
    if (started) { _previewDir = await newestRecordingDir(); return json(res, { ok: true }); }
    return json(res, { ok: false, error: 'preview-did-not-start' });
  } finally { _recBusy = false; }
}

// Stop the live preview and delete the throwaway recording.
// TODO(v0.2): POST /api/camera/live/stop — 停止实时预览，清理丢弃录制
async function apiLiveStop(req, res) {
  // unified_capture: just disarm the preview flag (no throwaway recording to clean up)
  if (await captureActive()) { _stereoPreview = false; return json(res, { ok: true, capture: true }); }
  if (await stereoActive()) { _stereoPreview = false; return json(res, { ok: true, stereo: true }); }
  if (_recBusy) return json(res, { ok: false, busy: true });
  _recBusy = true;
  try {
    const dir = _previewDir;
    _previewDir = null;
    if (await isPhysicallyRecording()) {
      await pressRecordButton();
      await waitFor(async () => !(await isPhysicallyRecording()), 10, 700);
    }
    if (dir && /\/recording_\d/.test(dir)) await sh(`rm -rf "${dir}" 2>/dev/null`, 8000);
    return json(res, { ok: true });
  } finally { _recBusy = false; }
}

// TODO(v0.2): POST /api/record/toggle — 切换录制开始/停止（支持预览→正式录制提升）
async function apiRecordToggle(req, res) {
  // unified_capture: delegate start/stop to its control socket
  if (await captureActive()) {
    if (_recBusy) return json(res, { ok: false, busy: true });
    _recBusy = true;
    try {
      const st = await captureCtl('status', 5000);
      if (!st.ok) return json(res, { ok: false, error: 'capture unreachable' });
      if (st.running) {
        const r = await captureCtl('stop', 15000);
        _maybeSkipPostCapture();
        return json(res, { ok: !!r.ok, recording: false, elapsed_ms: r.elapsed_ms || 0 });
      } else {
        const r = await captureCtl('start', 15000);
        if (!r.ok) return json(res, { ok: false, error: r.error || 'start failed' });
        return json(res, { ok: true, recording: true });
      }
    } finally { _recBusy = false; }
  }

  if (_recBusy) return json(res, { ok: false, busy: true });
  _recBusy = true;
  try {
    // Stereo-only: the daemon owns the session (guidaview can't record without
    // the Orbbec). One toggle starts/stops a recording_stereo_* recording.
    if (await stereoActive()) {
      _stereoPreview = false;   // recording supersedes the aim preview
      const r = await stereoCtl('toggle', 12000);
      // If stopping, mark the newest recording to skip post-capture when disabled.
      if (!r.recording) _maybeSkipPostCapture();
      return json(res, { ok: !!r.ok, stereo: true, ...r });
    }
    const physical = await isPhysicallyRecording();
    if (physical && _previewDir) {
      // Promote the running preview to the real recording in place: keep the
      // file, just stop treating it as disposable (no stop/restart gap).
      _previewDir = null;
      return json(res, { ok: true, promoted: true });
    }
    const wasRecording = physical;
    const out = await pressRecordButton();
    // If we just stopped, mark the newest recording to skip post-capture when disabled.
    if (wasRecording) _maybeSkipPostCapture();
    return json(res, { ok: out === 'ok', output: out });
  } finally { _recBusy = false; }
}

function _maybeSkipPostCapture() {
  const settings = loadSettings();
  if (settings.postCaptureEnabled !== false) return;
  // Allow the recording dir to be finalized before writing the marker.
  setTimeout(async () => {
    try {
      const dir = (await sh(`ls -1dt ${RECORD_DIR}/recording_* 2>/dev/null | head -1`)).trim();
      if (dir && /recording_/.test(dir) && fs.existsSync(dir)) {
        const marker = path.join(dir, '.skip_postprocess');
        if (!fs.existsSync(marker)) {
          fs.writeFileSync(marker, '');
          console.log('[settings] post-capture disabled → wrote .skip_postprocess to', dir);
        }
      }
    } catch (e) { console.error('[settings] skip marker error:', e.message); }
  }, 3000);
}

// TODO(v0.2): GET /api/camera/preview — 返回当前摄像头 JPEG 帧（<img src> 使用）
async function apiCameraPreview(req, res) {
  // Update reference timestamp for "active recording" detection
  await sh(`touch /tmp/.rec_ts 2>/dev/null`);

  // unified_capture: request a downscaled JPEG from the capture daemon.
  // The preview must be armed via /api/camera/live/start first.
  if (await captureActive()) {
    if (!_stereoPreview) {
      res.writeHead(503);
      return res.end('preview not started');
    }
    const r = await captureCtl(`preview:${PREVIEW_FILE}`, 5000);
    if (r && r.ok && fs.existsSync(PREVIEW_FILE)) {
      const data = fs.readFileSync(PREVIEW_FILE);
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Content-Length': data.length,
        'Cache-Control': 'no-store'
      });
      return res.end(data);
    }
    res.writeHead(503);
    return res.end('no preview available');
  }

  // Stereo cam: let the daemon produce the frame (live when idle, or scraped
  // from the recording MKV tail while recording) - it owns /dev/video0.
  if (await stereoActive()) {
    const r = await stereoCtl(`preview:${PREVIEW_FILE}`, 12000);
    if (r && r.ok && fs.existsSync(PREVIEW_FILE)) {
      const data = fs.readFileSync(PREVIEW_FILE);
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': data.length, 'Cache-Control': 'no-store' });
      return res.end(data);
    }
    res.writeHead(503);
    return res.end('no preview available');
  }

  const result = await sh(`bash "${CAM_FRAME_SH}" "${PREVIEW_FILE}" 2>/dev/null`, 8000);
  if (result.startsWith('ok') && fs.existsSync(PREVIEW_FILE)) {
    const data = fs.readFileSync(PREVIEW_FILE);
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': data.length, 'Cache-Control': 'no-store' });
    return res.end(data);
  }
  res.writeHead(503);
  res.end('no preview available');
}

// TODO(v0.2): POST /api/calibrator {action: start|stop|restart} — 控制校准器 systemd 服务
async function apiCalibrator(req, res) {
  const { action } = await readBody(req);
  if (!['start', 'stop', 'restart'].includes(action)) {
    return json(res, { ok: false, error: 'invalid action' }, 400);
  }
  const out = await sh(`systemctl ${action} ${CAL_SVC} 2>&1`, 10000);
  await new Promise(r => setTimeout(r, 1500));
  const status = await getCalibratorStatus();
  json(res, { ok: true, ...status, output: out });
}

// ── router ────────────────────────────────────────────────────────────────────
//
// TODO(v0.2): 以下所有 API 路由需要在 v0.2 后端正交实现。
// 前端接口定义来源: frontend/src/services/deviceApi.ts
//
// System:        GET  /api/status               POST /api/settings
// Camera:        GET  /api/camera/preview        POST /api/camera/live/start|stop
// Record:        GET  /api/record/status         POST /api/record/toggle
// Files:         GET  /api/files                 DELETE /api/files/:name
// Recordings:    POST /api/recordings/:name/decode|transfer
//                GET  /api/recordings/:name/preview
//                GET  /api/recordings/:name/:fileName
// WiFi:          GET  /api/wifi/scan             POST /api/wifi/connect|disconnect
// Bluetooth:     GET  /api/bt/scan               POST /api/bt/connect|disconnect
// Calibration:   POST /api/calibrator             POST /api/calibrate/start|stop
// Proxy:         ANY  /api/glove/cal/*
// ────────────────────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const parsed  = url.parse(req.url || '/');
  const pathname = parsed.pathname || '/';
  const method  = req.method || 'GET';

  res.setHeader('Access-Control-Allow-Origin', '*');
  if (method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // API routes
  if (pathname === '/api/status'              && method === 'GET')    return apiStatus(req, res);
  if (pathname === '/api/wifi/scan'           && method === 'GET')    return apiWifiScan(req, res);
  if (pathname === '/api/wifi/connect'        && method === 'POST')   return apiWifiConnect(req, res);
  if (pathname === '/api/wifi/disconnect'     && method === 'POST')   return apiWifiDisconnect(req, res);
  if (pathname === '/api/bt/scan'             && method === 'GET')    return apiBtScan(req, res);
  if (pathname === '/api/bt/connect'          && method === 'POST')   return apiBtConnect(req, res);
  if (pathname === '/api/bt/disconnect'       && method === 'POST')   return apiBtDisconnect(req, res);
  if (pathname === '/api/files'               && method === 'GET')    return apiFiles(req, res);
  if (pathname === '/api/calibrator'          && method === 'POST')   return apiCalibrator(req, res);
  if (pathname === '/api/calibrate/start'     && method === 'POST')   return apiCalibrateStart(req, res);
  if (pathname === '/api/calibrate/stop'      && method === 'POST')   return apiCalibrateStop(req, res);
  if (pathname === '/api/settings'            && method === 'GET')    return apiGetSettings(req, res);
  if (pathname === '/api/settings'            && method === 'POST')   return apiSaveSettings(req, res);
  if (pathname.startsWith('/api/glove/cal/'))                         return apiCalProxy(req, res);
  if (pathname === '/api/record/status'       && method === 'GET')    return apiRecordStatus(req, res);
  if (pathname === '/api/record/toggle'       && method === 'POST')   return apiRecordToggle(req, res);
  if (pathname === '/api/camera/live/start'   && method === 'POST')   return apiLiveStart(req, res);
  if (pathname === '/api/camera/live/stop'    && method === 'POST')   return apiLiveStop(req, res);
  if (pathname === '/api/camera/preview'      && method === 'GET')    return apiCameraPreview(req, res);
  if (pathname.startsWith('/api/files/')      && method === 'DELETE') {
    return apiFilesDelete(req, res, decodeURIComponent(pathname.slice('/api/files/'.length)));
  }
  // /api/recordings/<recName>/decode  — decode the in-frame IMU on demand
  if (pathname.startsWith('/api/recordings/') && pathname.endsWith('/decode') && method === 'POST') {
    const recName = decodeURIComponent(pathname.slice('/api/recordings/'.length, -'/decode'.length));
    return apiDecode(req, res, recName);
  }
  // /api/recordings/<recName>/transfer  — copy to external USB drive (no local delete)
  if (pathname.startsWith('/api/recordings/') && pathname.endsWith('/transfer') && method === 'POST') {
    const recName = decodeURIComponent(pathname.slice('/api/recordings/'.length, -'/transfer'.length));
    return apiTransfer(req, res, recName);
  }
  // /api/recordings/<recName>/preview  — generate + serve H.264 preview
  if (pathname.startsWith('/api/recordings/') && pathname.endsWith('/preview') && method === 'GET') {
    const recName = decodeURIComponent(pathname.slice('/api/recordings/'.length, -'/preview'.length));
    return apiPreview(req, res, recName);
  }
  // /api/recordings/<recName>/<fileName>  — stream any file in a recording dir
  if (pathname.startsWith('/api/recordings/') && method === 'GET') {
    const parts = decodeURIComponent(pathname.slice('/api/recordings/'.length)).split('/');
    return apiRecordingFile(req, res, parts[0], parts.slice(1).join('/'));
  }

  // Static files
  serveStatic(res, pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[device-ui] listening on http://0.0.0.0:${PORT}`);
  // Make sure no remembered WiFi network auto-rejoins on future boots.
  disableAllWifiAutoconnect()
    .then(() => console.log('[device-ui] WiFi autoconnect disabled on all saved profiles'))
    .catch((e) => console.warn('[device-ui] disableAllWifiAutoconnect failed:', e && e.message));
});
