'use strict';
/* global t, I18N */

window._lang = localStorage.getItem('lang') || 'zh';

const App = (() => {
  // ── State ──────────────────────────────────────────────────────────────────
  let _status   = null;
  let _page     = 'home';
  let _pollTimer = null;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function el(id)    { return document.getElementById(id); }
  function fmt(bytes) {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + ' MB';
    return (bytes / 1e3).toFixed(0) + ' KB';
  }
  function timeFmt(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
  }
  async function api(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(path, opts);
    return r.json();
  }
  function toast(msg, ms = 2200) {
    const el_ = el('toast');
    el_.textContent = msg;
    el_.classList.remove('hidden');
    clearTimeout(el_._t);
    el_._t = setTimeout(() => el_.classList.add('hidden'), ms);
  }
  function sigClass(sig) {
    if (sig >= 75) return 's4';
    if (sig >= 50) return 's3';
    if (sig >= 25) return 's2';
    return 's1';
  }
  function sigBars(sig) {
    return `<div class="sig ${sigClass(sig)}"><span></span><span></span><span></span><span></span></div>`;
  }
  // Exact match only: "Discharging" contains the substring "charging", so a
  // naive /charging/i.test() (or a case-sensitive /dis/ exclusion check, which
  // fails to match the capital D in "Discharging") both misreport it as
  // actively charging. Linux power_supply status is one of a small fixed set
  // (Unknown/Charging/Discharging/Not charging/Full) so exact-match is safe.
  function isChargingStatus(status) {
    return String(status || '').trim().toLowerCase() === 'charging';
  }
  function batEmoji(pct, status) {
    if (isChargingStatus(status)) return '⚡';
    if (pct >= 80) return '🔋';
    if (pct >= 40) return '🔋';
    if (pct >= 15) return '🪫';
    return '🪫';
  }
  function barClass(pct) {
    if (pct >= 85) return 'crit';
    if (pct >= 70) return 'warn';
    return '';
  }
  function batBarClass(pct) {
    if (pct <= 10) return 'crit';
    if (pct <= 25) return 'warn';
    return '';
  }

  // ── Clock ──────────────────────────────────────────────────────────────────
  function tickClock() {
    const now = new Date();
    const hh  = String(now.getHours()).padStart(2, '0');
    const mm  = String(now.getMinutes()).padStart(2, '0');
    el('tb-time').textContent = `${hh}:${mm}`;
  }

  // ── Top bar update ─────────────────────────────────────────────────────────
  function updateTopbar(status) {
    if (!status) return;
    const { battery } = status;
    const pct = battery.pct;
    const charging = isChargingStatus(battery.status);
    const icon = charging ? '⚡' : pct <= 10 ? '🪫' : '🔋';
    el('tb-bat').textContent = `${icon} ${pct}%`;
    el('tb-bat').style.color = pct <= 15 ? '#f85149' : pct <= 30 ? '#d29922' : '#6e7681';
  }

  // ── Lang toggle ────────────────────────────────────────────────────────────
  // Translate every static [data-i18n] element (bottom nav, topbar title…).
  // Must also run at startup: the HTML ships with Chinese defaults, so an
  // English session would otherwise keep Chinese tabs until the first toggle.
  function applyI18n() {
    el('btn-lang').textContent = window._lang === 'zh' ? 'EN' : '中';
    document.querySelectorAll('[data-i18n]').forEach(e => {
      e.textContent = t(e.dataset.i18n);
    });
    document.title = t('home.title');
  }

  function toggleLang() {
    window._lang = window._lang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('lang', window._lang);
    applyI18n();
    renderPage(_page);
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  function nav(page) {
    if (_page === page) return;
    if (_page === 'record') {
      stopRecordPoll();
      // Don't leave a throwaway live-preview recording running in the background.
      if (_recStatus && _recStatus.previewing) {
        try { navigator.sendBeacon ? navigator.sendBeacon('/api/camera/live/stop') : api('POST', '/api/camera/live/stop'); } catch(e) {}
      }
    }
    _page = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    el(`page-${page}`).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.page === page);
    });
    renderPage(page);
  }

  function renderPage(page) {
    switch (page) {
      case 'home':   renderHome();   break;
      case 'wifi':   renderWifi();   break;
      case 'bt':     renderBt();     break;
      case 'files':  renderFiles();  break;
      case 'glove':  renderGlove();  break;
      case 'record': renderRecord(); break;
    }
  }

  // ── Status polling ─────────────────────────────────────────────────────────
  async function fetchStatus() {
    try {
      _status = await api('GET', '/api/status');
      updateTopbar(_status);
      if (_page === 'home') renderHome();
      // Keep the Bluetooth tab live so glove connect/disconnect shows without
      // navigating away (skip while a scan is in progress to avoid wiping it).
      else if (_page === 'bt' && !_btScanning) renderBt();
    } catch { /* network error, keep old status */ }
  }
  function startPoll() {
    fetchStatus();
    _pollTimer = setInterval(fetchStatus, 8000);
  }

  // ── HOME page ──────────────────────────────────────────────────────────────
  function renderHome() {
    const s = _status;
    const pg = el('page-home');
    if (!s) {
      pg.innerHTML = `<div class="page-title">${t('home.title')}</div>
        <div style="text-align:center;padding:40px;color:#484f58"><div class="spinner"></div></div>`;
      return;
    }

    const { battery, storage, wifi, bluetooth, calibrator, recordings } = s;
    const batPct     = battery.pct;
    const batStatus  = battery.status;
    const isCharging = isChargingStatus(batStatus);
    const batLabel   = isCharging ? t('home.charging') : t('home.' + (batStatus || 'unknown').toLowerCase().replace(/ /g,'_')) || batStatus;
    const stoUsed    = fmt(storage.used);
    const stoTotal   = fmt(storage.total);
    const wifiLabel  = wifi.connected ? (wifi.ssid || t('home.connected')) : t('home.no_ssid');
    const btLabel    = bluetooth.connected ? t('home.connected') : t('home.disconnected');
    const recLabel   = t('home.recordings_count', { n: recordings.count });
    const recLast    = recordings.last ? `${t('home.last')}${recordings.last.replace('recording_', '').slice(0,12)}` : '—';
    const calActive  = calibrator.active;

    pg.innerHTML = `
<div class="page-title">${t('home.title')}</div>
<div class="dash-grid">
  <!-- Battery -->
  <div class="card">
    <div class="card-header">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2" stroke-linecap="round"/></svg>
      ${t('home.battery')}
    </div>
    <div class="bat-row">
      <span class="bat-icon">${batEmoji(batPct, batStatus)}</span>
      <div>
        <div class="card-val">${batPct}%</div>
        <div class="card-sub">${batLabel}${battery.voltage ? ' · ' + battery.voltage + 'V' : ''}</div>
      </div>
    </div>
    <div class="bar-wrap"><div class="bar-fill ${batBarClass(batPct)}" style="width:${batPct}%"></div></div>
  </div>
  <!-- Storage -->
  <div class="card">
    <div class="card-header">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
      ${t('home.storage')}
    </div>
    <div class="card-val">${stoUsed}</div>
    <div class="card-sub">/ ${stoTotal} · ${storage.pct}%</div>
    <div class="bar-wrap"><div class="bar-fill ${barClass(storage.pct)}" style="width:${storage.pct}%"></div></div>
  </div>
  <!-- WiFi -->
  <div class="card" onclick="App.nav('wifi')" style="cursor:pointer">
    <div class="card-header">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01" stroke-linecap="round"/></svg>
      ${t('home.wifi')}
    </div>
    <div class="card-val" style="font-size:16px;word-break:break-all">${wifiLabel}</div>
    <div class="card-sub">${wifi.connected ? sigClass(wifi.signal).toUpperCase() + ' · ' + wifi.signal + '%' : ''}</div>
  </div>
  <!-- Bluetooth -->
  <div class="card" onclick="App.nav('bt')" style="cursor:pointer">
    <div class="card-header">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" stroke-linejoin="round"/></svg>
      ${t('home.bluetooth')}
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
      <span class="dot ${bluetooth.connected ? 'dot-green' : 'dot-gray'}"></span>
      <span class="card-val" style="font-size:16px">${btLabel}</span>
    </div>
    <div class="card-sub">${bluetooth.connected ? bluetooth.device : ''}</div>
  </div>
</div>

<!-- Recordings -->
<div class="card" onclick="App.nav('files')" style="cursor:pointer">
  <div class="card-header">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    ${t('home.recordings')}
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center">
    <div>
      <div class="card-val" style="font-size:20px">${recLabel}</div>
      <div class="card-sub">${recLast}</div>
    </div>
    <svg viewBox="0 0 24 24" fill="none" stroke="#484f58" stroke-width="1.8" width="20" height="20"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
</div>

<!-- Calibrator service -->
<div class="card">
  <div class="card-header">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" stroke-linecap="round"/></svg>
    ${t('home.calibrator')}
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between">
    <span class="svc-badge ${calActive ? 'svc-active' : 'svc-inactive'}">
      <span class="dot ${calActive ? 'dot-green' : 'dot-red'}"></span>
      ${calActive ? t('home.svc_running') : t('home.svc_stopped')}
    </span>
    <button class="btn btn-sm ${calActive ? 'btn-danger' : 'btn-primary'}" style="width:auto"
      onclick="event.stopPropagation();App.toggleCalibrator(${calActive})">
      ${calActive ? t('glove.stop_svc') : t('glove.start_svc')}
    </button>
  </div>
</div>
</div>`;
  }

  // ── WIFI page ──────────────────────────────────────────────────────────────
  let _wifiNetworks = [];
  let _wifiScanning = false;

  function renderWifi() {
    const pg = el('page-wifi');
    const s  = _status;
    const wifi = s ? s.wifi : null;

    pg.innerHTML = `
<div class="page-title">${t('wifi.title')}</div>
${wifi && wifi.connected ? `
<div class="card">
  <div class="card-header">${t('wifi.current')}</div>
  <div style="display:flex;align-items:center;justify-content:space-between">
    <div>
      <div class="card-val" style="font-size:18px">${wifi.ssid || '—'}</div>
      <div class="card-sub">${sigBars(wifi.signal)} &nbsp;${wifi.signal}%</div>
    </div>
    <button class="btn btn-sm btn-danger" onclick="App.wifiDisconnect()">${t('wifi.disconnect')}</button>
  </div>
</div>` : `<div class="card"><div class="card-sub" style="text-align:center">${t('home.no_ssid')}</div></div>`}
<button class="btn ${_wifiScanning ? '' : 'btn-primary'}" id="btn-wifi-scan" onclick="App.wifiScan()">
  ${_wifiScanning ? `<span class="spinner"></span> ${t('wifi.scanning')}` : t('wifi.scan')}
</button>
<div id="wifi-list"></div>`;

    renderWifiList();
  }

  function renderWifiList() {
    const lst = el('wifi-list');
    if (!lst) return;
    lst.innerHTML = '';
    if (!_wifiNetworks.length) return;
    // Build rows programmatically and bind click handlers via closures.
    // (Inline onclick with JSON-stringified SSIDs breaks the HTML attribute
    //  because the JSON quotes collide with the attribute quotes.)
    _wifiNetworks.forEach(n => {
      const row = document.createElement('div');
      row.className = 'list-item';
      row.innerHTML = `
  <div class="list-item-main">
    <div class="list-item-name"></div>
    <div class="list-item-sub"></div>
  </div>
  <div class="list-item-right" style="display:flex;align-items:center;gap:8px">
    ${sigBars(n.signal)}
    ${n.active ? `<span class="dot dot-green"></span>` : ''}
  </div>`;
      row.querySelector('.list-item-name').textContent = n.ssid;
      row.querySelector('.list-item-sub').textContent  = n.security || t('wifi.open');
      row.addEventListener('click', () => wifiConnect(n.ssid, n.security));
      lst.appendChild(row);
    });
  }

  async function wifiScan() {
    if (_wifiScanning) return;
    _wifiScanning = true;
    renderWifi();
    try {
      const r = await api('GET', '/api/wifi/scan');
      _wifiNetworks = r.networks || [];
    } catch { toast('Scan failed'); }
    _wifiScanning = false;
    renderWifi();
  }

  async function wifiDisconnect() {
    await api('POST', '/api/wifi/disconnect');
    await fetchStatus();
    renderWifi();
    toast(t('wifi.disconnect') + ' OK');
  }

  function wifiConnect(ssid, security) {
    const needPwd = !!(security && !/^none/i.test(security) && security !== '');
    if (!needPwd) {                              // open network — connect directly
      toast(t('wifi.connecting'));
      api('POST', '/api/wifi/connect', { ssid, password: '' }).then(async r => {
        toast(r.ok ? `✓ ${ssid}` : `✗ ${t('wifi.connect_failed')}`);
        await fetchStatus(); renderWifi();
      });
      return;
    }
    const body = `
<div class="wifi-pwd-row">
  <input class="input" id="wifi-pwd" type="password" inputmode="none" autocomplete="off" readonly
         placeholder="${t('wifi.enter_password')}">
  <button type="button" class="pwd-eye" id="wifi-pwd-eye" aria-label="show password">&#128065;</button>
</div>
<div id="wifi-cstatus" class="wifi-cstatus"></div>
<div id="osk" class="kbd"></div>`;
    showModal(ssid, body, [
      { label: t('wifi.cancel'),  cls: '',           action: () => closeModal() },
      { label: t('wifi.connect'), cls: 'btn-primary', action: () => _wifiTryConnect(ssid) },
    ]);
    // Wire the show/hide toggle and bind the on-screen keyboard to the field.
    setTimeout(() => {
      const input = el('wifi-pwd');
      const eye   = el('wifi-pwd-eye');
      if (eye && input) eye.addEventListener('click', () => {
        input.type = input.type === 'password' ? 'text' : 'password';
        eye.classList.toggle('on', input.type === 'text');
      });
      if (input) Keyboard.attach(input, el('osk'), (ev) => { if (ev === 'done') _wifiTryConnect(ssid); });
    }, 30);
  }

  async function _wifiTryConnect(ssid) {
    const input = el('wifi-pwd');
    const pwd   = input ? input.value : '';
    const st    = el('wifi-cstatus');
    const btn   = el('modal-action-1');          // the "Connect" button
    if (!pwd) {
      if (st) { st.className = 'wifi-cstatus err'; st.textContent = t('wifi.enter_password'); }
      return;
    }
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
    if (st)  { st.className = 'wifi-cstatus'; st.innerHTML = `<span class="spinner"></span> ${t('wifi.connecting')}`; }
    const r = await api('POST', '/api/wifi/connect', { ssid, password: pwd });
    if (r.ok) {
      if (st) { st.className = 'wifi-cstatus ok'; st.textContent = `✓ ${t('wifi.connected_ok')}`; }
      toast(`✓ ${ssid}`);
      setTimeout(async () => { closeModal(); await fetchStatus(); renderWifi(); }, 800);
    } else {
      const msg = r.error === 'bad_password' ? t('wifi.bad_password')
                : r.error === 'not_found'    ? t('wifi.not_found')
                : (t('wifi.connect_failed') + (r.error ? ` (${r.error})` : ''));
      if (st)  { st.className = 'wifi-cstatus err'; st.textContent = `✗ ${msg}`; }
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    }
  }

  // ── BLUETOOTH page ─────────────────────────────────────────────────────────
  let _btDevices  = [];
  let _btScanning = false;

  function renderBt() {
    const pg  = el('page-bt');
    const s   = _status;
    const bt  = s ? s.bluetooth : null;
    const gloves = bt && bt.gloves ? bt.gloves : {};
    const anyConnected = bt && bt.connected;

    const gloveCard = (side, label) => {
      const g = gloves[side] || {};
      const conn = !!g.connected;
      return `
<div class="card" style="margin-bottom:8px">
  <div class="card-header">${label}</div>
  <div style="display:flex;align-items:center;justify-content:space-between">
    <div style="display:flex;align-items:center;gap:10px">
      <span class="dot ${conn ? 'dot-green' : 'dot-gray'}"></span>
      <div>
        <div class="card-val" style="font-size:15px">${conn ? (g.device || 'MXSPP_SENSOR') : t('bt.disconnected')}</div>
        ${conn ? `<div class="card-sub">${g.address || ''}</div>` : ''}
      </div>
    </div>
    <button class="btn btn-sm ${conn ? 'btn-danger' : 'btn-primary'}" onclick="App.btToggleSide('${side}',${conn})">
      ${conn ? t('bt.disconnect') : t('bt.connect')}
    </button>
  </div>
</div>`;
    };

    pg.innerHTML = `
<div class="page-title">${t('bt.title')}</div>
${gloveCard('right', t('bt.glove_right'))}
${gloveCard('left',  t('bt.glove_left'))}

${anyConnected && bt.via === 'bridge'
  ? `<div class="card" style="background:#0d2118;border:1px solid #238636;padding:10px 14px;font-size:12px;color:#8b949e;line-height:1.5">${t('bt.auto_note')}</div>`
  : `<div class="card-sub" style="padding:0 4px;margin-bottom:8px">${t('bt.note')}</div>
<button class="btn btn-primary" onclick="App.btReconnect()" style="margin-bottom:8px">
  ${t('bt.reconnect')}
</button>
<button class="btn ${_btScanning ? '' : ''}" id="btn-bt-scan" onclick="App.btScan()" style="margin-bottom:4px">
  ${_btScanning ? `<span class="spinner"></span> ${t('bt.scanning')}` : t('bt.scan')}
</button>
<div id="bt-list"></div>`
}
`;

    renderBtList();
  }

  function renderBtList() {
    const lst = el('bt-list');
    if (!lst || !_btDevices.length) return;
    lst.innerHTML = _btDevices.map(d => `
<div class="list-item" onclick="App.btConnect(${JSON.stringify(d.address)})">
  <span class="dot ${d.connected ? 'dot-green' : 'dot-gray'}"></span>
  <div class="list-item-main">
    <div class="list-item-name">${d.name}</div>
    <div class="list-item-sub">${d.address}${d.paired ? ' · paired' : ''}</div>
  </div>
  ${d.connected ? `<span style="color:#3fb950;font-size:12px">●</span>` : ''}
</div>`).join('');
  }

  async function btScan() {
    if (_btScanning) return;
    _btScanning = true;
    renderBt();
    try {
      const r = await api('GET', '/api/bt/scan');
      _btDevices = r.devices || [];
    } catch { toast('Scan failed'); }
    _btScanning = false;
    renderBt();
  }

  // Legacy single-button toggle (kept for back-compat)
  async function btToggle(connected) {
    return btToggleSide('right', connected);
  }

  // Per-side connect/disconnect — restarts the recorder service which handles both gloves
  async function btToggleSide(side, connected) {
    const MACS = { right: '04:26:04:09:0A:9B', left: '04:26:04:15:0C:65' };  // SPP MACs
    if (connected) {
      await api('POST', '/api/bt/disconnect');
      toast(t('bt.disconnect') + ' OK');
    } else {
      toast(t('bt.connect') + '…');
      const r = await api('POST', '/api/bt/connect', { address: MACS[side] || MACS.right });
      toast(r.ok ? `✓ ${t('bt.connected')}` : '✗ failed');
    }
    await fetchStatus();
    renderBt();
  }

  async function btConnect(address) {
    toast(t('bt.connect') + '…');
    const r = await api('POST', '/api/bt/connect', { address });
    toast(r.ok ? `✓ ${t('bt.connected')}` : '✗ failed');
    await fetchStatus();
    renderBt();
  }

  async function btReconnect() {
    toast(t('bt.connect') + '…');
    const r = await api('POST', '/api/bt/connect', { address: '04:26:04:09:0A:9B' });  // SPP right
    toast(r.ok ? `✓ ${t('bt.connected')}` : t('bt.reconnecting'));
    await fetchStatus();
    renderBt();
  }

  // ── FILES page ─────────────────────────────────────────────────────────────
  let _files = null;

  function streamTag(label, ok) {
    const c = ok ? '#4ade80' : '#484f58';
    return `<span style="font-size:10px;border:1px solid ${c};color:${c};border-radius:3px;padding:1px 4px;margin-right:3px">${label}</span>`;
  }

  let _filesPoll = null;
  let _filesSig  = '';

  // Fingerprint of everything the Files list paints that can change on its
  // own (disk hot-plug, decode/transfer progress). Used by the idle poll to
  // repaint only when needed, so scrolling isn't reset every 3 seconds.
  function filesSig(r) {
    const ext = r.externalDisk ? `D${r.externalDisk.free}` : '-';
    return ext + '|' + (r.files || []).map(f =>
      `${f.name}:${f.decoding ? 1 : 0}${f.decoded ? 1 : 0}${f.transferring ? 1 : 0}${f.transferred ? 1 : 0}:${f.transferPct}`
    ).join(',');
  }

  // Idle watcher: while the Files tab is open, re-check the list every 3s so
  // a freshly plugged-in USB drive makes the Transfer buttons appear without
  // having to leave and re-enter the tab.
  async function filesPollTick() {
    if (_page !== 'files') return;
    try {
      const r = await api('GET', '/api/files');
      if (_page !== 'files') return;
      if (filesSig(r) !== _filesSig) return renderFiles(r);
    } catch (e) { /* transient — retry on next tick */ }
    clearTimeout(_filesPoll);
    _filesPoll = setTimeout(filesPollTick, 3000);
  }

  async function renderFiles(prefetched) {
    const pg = el('page-files');
    if (!prefetched) {
      pg.innerHTML = `
<div class="page-title">${t('files.title')}</div>
<div style="text-align:center;padding:30px"><span class="spinner"></span></div>`;
    }

    try {
      const r = prefetched || await api('GET', '/api/files');
      _filesSig = filesSig(r);
      _files = r.files || [];
      const ext = r.externalDisk || null;
      const s = _status ? _status.storage : null;
      pg.innerHTML = `
<div class="page-title">${t('files.title')}</div>
${s ? `<div class="card-sub" style="margin-bottom:4px">${t('files.storage')}${fmt(s.used)} / ${fmt(s.total)} (${s.pct}%)<div class="bar-wrap" style="margin-top:6px"><div class="bar-fill ${barClass(s.pct)}" style="width:${s.pct}%"></div></div></div>` : ''}
${ext ? `<div class="card-sub" style="margin-bottom:4px;color:#4ade80">${t('files.ext_disk')}${ext.total ? ` · ${t('files.ext_free', { free: fmt(ext.free) })}` : ''}</div>` : ''}
<div class="card-sub" style="margin-bottom:8px">${t('files.total', { n: _files.length })}</div>
${_files.length === 0 ? `<div class="card" style="text-align:center;color:#484f58;padding:30px">${t('files.empty')}</div>` : ''}
${_files.map(f => `
<div class="list-item" onclick="App.openRecording('${f.name}')" style="cursor:pointer">
  <div class="list-item-main">
    <div class="list-item-name" style="font-size:13px">${f.name.replace('recording_','')}</div>
    <div style="margin-top:3px">${streamTag('Color',f.hasColor)}${streamTag('Depth',f.hasDepth)}${streamTag('Glove',f.hasGlove)}${streamTag('IMU',f.hasImu)}${f.hasStereo?streamTag(t('files.stereo'),true):''}${f.hasAudio?streamTag(t('files.audio'),true):''}${f.decoded?streamTag('IMU✓',true):''}</div>
    <div class="list-item-sub">${fmt(f.size)} · ${timeFmt(f.mtime)}</div>
  </div>
  ${(f.needsDecode || f.decoding) ? `<button class="btn btn-sm btn-primary" style="flex-shrink:0;margin-right:6px;min-width:62px" ${f.decoding?'disabled':''}
    onclick="event.stopPropagation();App.decodeFile('${f.name}')">${f.decoding?t('files.decoding'):t('files.decode')}</button>` : ''}
  ${ext ? `<button class="btn btn-sm ${f.transferred?'':'btn-primary'}" style="flex-shrink:0;margin-right:6px;min-width:62px" ${(f.transferring||f.transferred)?'disabled':''}
    onclick="event.stopPropagation();App.transferFile('${f.name}')">${f.transferring?`${f.transferPct}%`:(f.transferred?t('files.transferred'):t('files.transfer'))}</button>` : ''}
  <button class="file-del" onclick="event.stopPropagation();App.deleteFile('${f.name}')">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
  </button>
</div>`).join('')}`;
      // Keep watching while the tab is open: catches decode/transfer progress
      // AND external-drive hot-plug (repaints only when something changed).
      clearTimeout(_filesPoll);
      _filesPoll = setTimeout(filesPollTick, 3000);
    } catch (e) {
      pg.innerHTML = `<div class="page-title">${t('files.title')}</div>
        <div class="card" style="color:#f85149">${e.message}</div>`;
    }
  }

  function openRecording(name) {
    const f = (_files || []).find(x => x.name === name);
    if (!f) return;
    const previewUrl = `/api/recordings/${encodeURIComponent(name)}/preview`;

    // Remove old overlay if any
    const old = document.getElementById('rec-overlay');
    if (old) old.remove();

    const ov = document.createElement('div');
    ov.id = 'rec-overlay';
    ov.style.cssText = [
      'position:fixed','inset:0','z-index:300','background:#0d1117',
      'display:flex','flex-direction:column','overflow:hidden',
    ].join(';');

    const tags = streamTag('Color',f.hasColor) + streamTag('Depth',f.hasDepth) +
                 streamTag('Glove',f.hasGlove) + streamTag('IMU',f.hasImu) +
                 (f.hasStereo?streamTag(t('files.stereo'),true):'') +
                 (f.hasAudio?streamTag(t('files.audio'),true):'');
    const title = name.replace('recording_','');

    ov.innerHTML = `
<div style="display:flex;align-items:center;padding:6px 10px;border-bottom:1px solid #21262d;flex-shrink:0;gap:8px">
  <button id="rec-back" style="background:none;border:none;color:#58a6ff;font-size:15px;cursor:pointer;padding:4px 6px">← ${t('files.cancel')}</button>
  <span style="flex:1;font-size:14px;font-weight:600;color:#e6edf3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${title}</span>
  <button id="rec-del" class="btn btn-sm btn-danger" style="flex-shrink:0">${t('files.delete')}</button>
</div>
<div id="rec-video-wrap" style="background:#000;width:100%;flex-shrink:0;display:flex;align-items:center;justify-content:center;position:relative">
  ${f.hasColor ? `
  <video id="rec-video" controls playsinline preload="auto"
    style="width:100%;height:100%;max-height:100%;object-fit:contain;display:block"
    src="${previewUrl}">
  </video>
  <div id="rec-loading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.7);color:#8b949e;font-size:13px;gap:10px;pointer-events:none">
    <span class="spinner"></span><span>${t('files.generating')}</span>
  </div>` : `<div style="color:#484f58;font-size:13px;padding:30px">${t('files.no_video')}</div>`}
</div>
<div style="padding:10px 14px;flex:1;overflow-y:auto">
  <div style="margin-bottom:6px">${tags}</div>
  <div style="color:#8b949e;font-size:12px">${fmt(f.size)}</div>
</div>`;

    document.body.appendChild(ov);

    // Size video area: landscape → 56% of screen height; portrait → 40% of screen width height
    const vw = window.innerWidth, vh = window.innerHeight;
    const topH = 46, infoH = 66;
    const videoH = Math.max(160, Math.min(vh - topH - infoH, Math.round(vw * 9 / 16)));
    const wrap = ov.querySelector('#rec-video-wrap');
    wrap.style.height = videoH + 'px';

    // Hide loading spinner once video can play
    const vid = ov.querySelector('#rec-video');
    const loadDiv = ov.querySelector('#rec-loading');
    if (vid && loadDiv) {
      vid.addEventListener('canplay', () => { loadDiv.style.display = 'none'; }, { once: true });
      vid.addEventListener('error', () => {
        loadDiv.innerHTML = `<span style="color:#f85149">${t('files.video_err')}</span>`;
        loadDiv.style.pointerEvents = 'none';
      }, { once: true });
    }

    ov.querySelector('#rec-back').addEventListener('click', () => {
      if (vid) { vid.pause(); vid.src = ''; }
      ov.remove();
    });
    ov.querySelector('#rec-del').addEventListener('click', () => {
      if (vid) { vid.pause(); vid.src = ''; }
      ov.remove();
      deleteFile(name);
    });
  }

  async function deleteFile(name) {
    showModal(
      t('files.confirm_del'),
      `<p style="color:#8b949e;font-size:14px;word-break:break-all">${t('files.confirm_body')}<br><strong>${name}</strong></p>`,
      [
        { label: t('files.cancel'), cls: '', action: closeModal },
        {
          label: t('files.delete'), cls: 'btn-danger',
          action: async () => {
            closeModal();
            const r = await api('DELETE', `/api/files/${encodeURIComponent(name)}`);
            if (r.ok) { toast('✓ Deleted'); renderFiles(); fetchStatus(); }
            else toast('✗ Delete failed');
          }
        }
      ]
    );
  }

  async function transferFile(name) {
    let r;
    try { r = await api('POST', `/api/recordings/${encodeURIComponent(name)}/transfer`); }
    catch { return toast(t('files.transfer_failed')); }
    if (r && r.ok) { toast(t('files.transfer_started')); renderFiles(); }
    else if (r && r.error === 'busy') { toast(t('files.transfer_busy')); renderFiles(); }
    else if (r && r.error === 'no_disk') toast(t('files.no_disk'));
    else toast(t('files.transfer_failed'));
  }

  async function decodeFile(name) {
    let r;
    try { r = await api('POST', `/api/recordings/${encodeURIComponent(name)}/decode`); }
    catch { return toast(t('files.decode_failed')); }
    if (r && r.ok) { toast(t('files.decode_started')); renderFiles(); }
    else if (r && r.error === 'busy') { toast(t('files.decode_busy')); renderFiles(); }
    else toast(t('files.decode_failed'));
  }

  // ── GLOVE page ─────────────────────────────────────────────────────────────
  function renderGlove() {
    const pg  = el('page-glove');
    const s   = _status;
    const cal = s ? s.calibrator : null;
    const port = 8888;
    const calUrl = `http://${location.hostname}:${port}`;

    const gloves = _status && _status.bluetooth && _status.bluetooth.gloves || {};
    const wired  = _status && _status.wiredGloves || {};
    const bleConnected = _status && _status.bluetooth && _status.bluetooth.connected;

    const calCardForSide = (side, label) => {
      const g = gloves[side] || {};
      const btConn    = !!g.connected;
      const wiredConn = !!wired[side];
      const conn      = btConn || wiredConn;
      // Prefer wired transport when the glove is on USB (no BT handoff needed).
      const transport = (wiredConn && !btConn) ? 'wired' : 'spp';
      const viaTag = wiredConn ? t('glove.via_wired') : (btConn ? t('glove.via_bt') : '');
      return `
<div class="card" style="padding:12px 14px;margin-bottom:8px;background:#0d1f12;border:1px solid ${conn ? '#238636' : '#30363d'}">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
    <div style="font-size:13px;font-weight:600;color:${conn ? '#3fb950' : '#8b949e'}">
      ${label}${viaTag ? ` <span style="font-size:11px;font-weight:400;color:#8b949e">(${viaTag})</span>` : ''}
    </div>
    <span class="dot ${conn ? 'dot-green' : 'dot-gray'}" style="width:9px;height:9px"></span>
  </div>
  ${conn
    ? `<div style="font-size:12px;color:#8b949e;margin-bottom:8px">${t('glove.cal_ble_hint')}</div>
       <button class="btn btn-sm" onclick="App.startCalibrateMode('${side}','${transport}')">${t('glove.cal_start_btn')}</button>`
    : `<div style="font-size:12px;color:#8b949e">${t('glove.cal_ble_connect_hint')}</div>`
  }
</div>`;
    };

    pg.innerHTML = `
<div class="page-title">${t('glove.title')}</div>
<div class="card">
  <div style="display:flex;align-items:center;justify-content:space-between">
    <span class="svc-badge ${cal && cal.active ? 'svc-active' : 'svc-inactive'}">
      <span class="dot ${cal && cal.active ? 'dot-green' : 'dot-red'}"></span>
      ${cal && cal.active ? t('home.svc_running') : t('glove.svc_off')}
    </span>
    <div style="display:flex;gap:8px">
      ${cal && cal.active
        ? `<button class="btn btn-sm btn-danger" onclick="App.toggleCalibrator(true)">${t('glove.stop_svc')}</button>
           <button class="btn btn-sm" onclick="App.toggleCalibrator('restart')">${t('glove.restart_svc')}</button>`
        : `<button class="btn btn-sm btn-primary" onclick="App.toggleCalibrator(false)">${t('glove.start_svc')}</button>`
      }
    </div>
  </div>
</div>
${cal && cal.active ? `
<!-- Per-side BLE calibration cards -->
${calCardForSide('right', t('bt.glove_right'))}
${calCardForSide('left',  t('bt.glove_left'))}
<button class="btn btn-primary" onclick="location.href='${calUrl}/?kiosk=1'">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
  ${t('glove.open_browser')} (:${port})
</button>
<iframe id="glove-iframe" src="${calUrl}" title="Glove Calibrator"></iframe>
` : `
<div class="card" style="text-align:center;padding:30px;color:#484f58">
  <p style="margin-bottom:16px">${t('glove.svc_off')}</p>
  <button class="btn btn-primary" onclick="App.toggleCalibrator(false)">${t('glove.start_svc')}</button>
</div>`}`;
  }

  async function toggleCalibrator(currentlyActive) {
    const action = currentlyActive === 'restart' ? 'restart' : currentlyActive ? 'stop' : 'start';
    toast(action + '…');
    const r = await api('POST', '/api/calibrator', { action });
    toast(r.active ? `✓ ${t('home.svc_running')}` : `✓ ${t('home.svc_stopped')}`);
    await fetchStatus();
    if (_page === 'home')  renderHome();
    if (_page === 'glove') renderGlove();
  }

  async function startCalibrateMode(side, transport) {
    side = side || 'right';
    transport = transport || 'spp';
    const port = 8888;
    const calUrl = `http://${location.hostname}:${port}`;
    const sideLabel = side === 'left' ? t('bt.glove_left') : t('bt.glove_right');
    showModal(t('glove.cal_modal_title'),
      `<p style="color:#8b949e;font-size:13px;margin-bottom:8px">${sideLabel} — ${t('glove.cal_connecting')}</p>
       <div id="cal-progress" style="color:#3fb950;font-size:12px">⏳ ${t('glove.cal_wait')}</div>`,
      []
    );
    let r;
    try {
      r = await api('POST', '/api/calibrate/start', { side, transport });
    } catch(e) {
      r = { ok: false, error: String(e) };
    }
    closeModal();
    if (!r.ok) {
      toast(`✗ ${r.error || t('rec.err')}`);
      return;
    }
    toast(`✓ ${t('glove.cal_ble_ready')}`);
    // Navigate the SAME (kiosk) window to the calibrator — no new tab, no
    // browser chrome.  The calibrator's kiosk mode shows a "done" button that
    // returns to us with ?calDone=1 so we can resume the recorder (see init()).
    location.href = `${calUrl}/?kiosk=1&side=${side}&transport=${transport}`;
  }

  // When the calibrator kiosk page navigates back with ?calDone=1, finish the
  // handoff: stop calibration mode (restarts the SPP recorder) and clean the URL.
  async function handleCalReturn() {
    const q = new URLSearchParams(location.search);
    if (q.get('calDone') !== '1') return;
    const side = q.get('side') === 'left' ? 'left' : 'right';
    const transport = q.get('transport') || 'spp';
    history.replaceState(null, '', location.pathname);
    toast(t('bt.reconnecting'));
    try { await api('POST', '/api/calibrate/stop', { side, transport }); } catch(e) {}
    await fetchStatus();
    nav('glove');
  }

  // ── Recording page ─────────────────────────────────────────────────────────
  let _recStatus    = null;
  let _recPollTimer = null;
  let _previewTimer = null;
  let _recBusy      = false;

  let _liveBusy = false;   // live-preview start/stop in flight

  async function renderRecord() {
    const pg = el('page-record');
    // Render a stable skeleton once; refreshRecordUI() only updates dynamic bits
    // in place so the live preview <img> is never destroyed (no flicker).
    pg.innerHTML = `<div class="page-title">${t('rec.title')}</div>
<div class="card" style="padding:14px 16px;margin-bottom:10px">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
    <span id="rec-cam-dot" class="dot dot-red" style="width:10px;height:10px;flex-shrink:0"></span>
    <span style="font-size:14px">${t('rec.camera')}</span>
    <span id="rec-cam-text" style="margin-left:auto;font-size:12px;color:#f85149"></span>
  </div>
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
    <span id="rec-glove-dot" class="dot dot-red" style="width:10px;height:10px;flex-shrink:0"></span>
    <span style="font-size:14px">${t('rec.glove')}</span>
    <span id="rec-glove-text" style="margin-left:auto;font-size:12px;color:#f85149"></span>
  </div>
  <div style="display:flex;align-items:center;gap:10px">
    <span id="rec-mic-dot" class="dot dot-red" style="width:10px;height:10px;flex-shrink:0"></span>
    <span style="font-size:14px">${t('rec.mic')}</span>
    <span id="rec-mic-text" style="margin-left:auto;font-size:12px;color:#f85149"></span>
  </div>
</div>

<div class="card" style="padding:12px 16px;margin-bottom:10px;display:flex;align-items:center;gap:12px">
  <div style="flex:1;min-width:0">
    <div style="font-size:14px">${t('rec.postproc')}</div>
    <div style="font-size:11px;color:#8b949e;margin-top:3px;line-height:1.35">${t('rec.postproc_hint')}</div>
  </div>
  <button id="rec-pp-toggle" onclick="App.togglePostProcess()" aria-pressed="false"
    style="position:relative;width:48px;height:27px;border-radius:14px;border:none;background:#30363d;cursor:pointer;flex-shrink:0;transition:background .2s;padding:0">
    <span id="rec-pp-knob" style="position:absolute;left:3px;top:3px;width:21px;height:21px;border-radius:50%;background:#fff;transition:transform .2s"></span>
  </button>
</div>

<div id="rec-preview-area" style="margin-bottom:12px">
  <div id="rec-preview-box" style="position:relative;background:#000;border-radius:8px;overflow:hidden;min-height:120px;display:none;align-items:center;justify-content:center">
    <img id="rec-preview-img" alt="preview" style="max-width:100%;max-height:200px;display:block"
      onerror="this.style.display='none';var h=document.getElementById('rec-preview-hint');if(h)h.style.display='flex'">
    <div id="rec-preview-hint" style="display:none;flex-direction:column;align-items:center;gap:8px;color:#484f58;padding:20px">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
      <span style="font-size:13px">${t('rec.preview_na')}</span>
    </div>
    <div id="rec-preview-tag" style="position:absolute;left:6px;top:6px;font-size:11px;padding:2px 7px;border-radius:4px;background:rgba(0,0,0,.55);color:#fff;display:none"></div>
  </div>
  <div id="rec-aim-card" class="card" style="text-align:center;padding:18px;color:#8b949e;font-size:13px;display:none">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:6px"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
    <div>${t('rec.preview_aim')}</div>
  </div>
  <div id="rec-nocam-card" class="card" style="text-align:center;padding:20px;color:#484f58;font-size:13px;display:none">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:6px"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
    <div>${t('rec.no_camera')}</div>
  </div>
</div>

<button id="rec-live-btn" class="btn" style="width:100%;height:46px;font-size:15px;font-weight:600;border-radius:10px;margin-bottom:8px;display:none"
  onclick="App.startLivePreview()">${t('rec.live_start')}</button>
<button id="rec-stop-preview-btn" class="btn" style="width:100%;height:46px;font-size:15px;font-weight:600;border-radius:10px;margin-bottom:8px;display:none"
  onclick="App.stopLivePreview()">${t('rec.live_stop')}</button>
<button id="rec-btn" class="btn btn-primary"
  style="width:100%;height:64px;font-size:18px;font-weight:700;border-radius:12px;letter-spacing:1px;display:none"
  onclick="App.toggleRecord()"></button>
<div id="rec-hint" style="text-align:center;font-size:12px;margin-top:8px"></div>`;
    await refreshRecordUI();
    loadPostProcess();
    startRecordPoll();
  }

  // ── Post-process (auto-decode) toggle ──────────────────────────────────────
  let _ppEnabled = true;
  function _setPPToggle(on) {
    const b = el('rec-pp-toggle'), k = el('rec-pp-knob');
    if (!b) return;
    b.style.background = on ? '#238636' : '#30363d';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (k) k.style.transform = on ? 'translateX(21px)' : 'translateX(0)';
  }
  async function loadPostProcess() {
    try {
      const s = await api('GET', '/api/settings');
      _ppEnabled = s.postCaptureEnabled !== false;
    } catch { _ppEnabled = true; }
    _setPPToggle(_ppEnabled);
  }
  async function togglePostProcess() {
    _ppEnabled = !_ppEnabled;
    _setPPToggle(_ppEnabled);
    try {
      await api('POST', '/api/settings', { postCaptureEnabled: _ppEnabled });
      toast(_ppEnabled ? t('rec.postproc_on') : t('rec.postproc_off'));
    } catch {
      _ppEnabled = !_ppEnabled;       // revert on failure
      _setPPToggle(_ppEnabled);
      toast(t('rec.err'));
    }
  }

  function startRecordPoll() {
    stopRecordPoll();
    _recPollTimer = setInterval(refreshRecordUI, 2000);
  }

  function stopRecordPoll() {
    if (_recPollTimer) { clearInterval(_recPollTimer); _recPollTimer = null; }
    stopPreviewRefresh();
  }

  async function refreshRecordUI() {
    if (_page !== 'record') { stopRecordPoll(); return; }
    if (_recBusy || _liveBusy) return;   // don't fight an in-flight transition
    try { _recStatus = await api('GET', '/api/record/status'); } catch(e) { return; }
    if (!el('rec-btn')) return;

    const { cameraConnected, gloveConnected, gloveSides, recording, previewing, guidaviewReady, cameraType, micConnected } = _recStatus;
    // A connected camera is enough to record; the glove is optional and is
    // captured in sync when present (both stereo-RGB and depth record fine
    // without it). Showing the glove status is informational, not a gate.
    const readyToRecord = cameraConnected;
    const liveOn = recording || previewing;   // camera actively streaming frames

    // Status: camera (with stereo/depth channel label so the route is explicit)
    const camDot = el('rec-cam-dot'), camText = el('rec-cam-text');
    if (camDot) camDot.className = `dot ${cameraConnected ? 'dot-green' : 'dot-red'}`;
    if (camText) {
      const camState = recording ? t('rec.recording_cam')
        : previewing ? t('rec.preview_live')
        : cameraConnected ? (guidaviewReady ? t('rec.ready') : t('rec.connected'))
        : t('rec.disconnected');
      const camKind = cameraType === 'stereo' ? t('rec.cam_stereo')
        : cameraType === 'depth' ? t('rec.cam_depth') : '';
      camText.textContent = (cameraConnected && camKind) ? `${camState} · ${camKind}` : camState;
      camText.style.color = cameraConnected ? '#3fb950' : '#f85149';
    }
    // Status: glove — show which hand(s) are connected (left / right / both).
    const gDot = el('rec-glove-dot'), gText = el('rec-glove-text');
    const gs = gloveSides || {};
    const gLeft = !!gs.left, gRight = !!gs.right;
    if (gDot) gDot.className = `dot ${gloveConnected ? 'dot-green' : 'dot-red'}`;
    if (gText) {
      gText.textContent = (gLeft && gRight) ? t('rec.glove_both')
        : gLeft  ? t('rec.glove_left')
        : gRight ? t('rec.glove_right')
        : t('rec.glove_no');
      gText.style.color = gloveConnected ? '#3fb950' : '#f85149';
    }
    // Status: microphone — external USB mic. Audio is captured in sync when a
    // mic is present (recorder records audio_*.wav only while one is plugged in).
    const mDot = el('rec-mic-dot'), mText = el('rec-mic-text');
    if (mDot) mDot.className = `dot ${micConnected ? 'dot-green' : 'dot-red'}`;
    if (mText) {
      mText.textContent = micConnected
        ? (recording ? t('rec.mic_recording') : t('rec.mic_on'))
        : t('rec.mic_no');
      mText.style.color = micConnected ? '#3fb950' : '#f85149';
    }

    // Preview area: live <img> while previewing/recording; aim hint when idle.
    const box = el('rec-preview-box'), aim = el('rec-aim-card'), nocam = el('rec-nocam-card'), tag = el('rec-preview-tag');
    if (!cameraConnected) {
      if (box) box.style.display = 'none';
      if (aim) aim.style.display = 'none';
      if (nocam) nocam.style.display = 'block';
      stopPreviewRefresh();
    } else if (liveOn) {
      if (box) box.style.display = 'flex';
      if (aim) aim.style.display = 'none';
      if (nocam) nocam.style.display = 'none';
      if (tag) { tag.style.display = 'block'; tag.textContent = t('rec.preview_live'); }
      if (!_previewTimer) { refreshPreview(); _previewTimer = setInterval(refreshPreview, 1500); }
    } else {
      if (box) box.style.display = 'none';
      if (aim) aim.style.display = 'block';
      if (nocam) nocam.style.display = 'none';
      stopPreviewRefresh();
    }

    // Buttons per state: idle -> [live preview]+[record]; previewing -> [stop
    // preview]+[start real]; recording -> [stop].
    const liveBtn = el('rec-live-btn'), stopPrevBtn = el('rec-stop-preview-btn'), btn = el('rec-btn');
    if (liveBtn) liveBtn.style.display = (cameraConnected && !liveOn) ? 'block' : 'none';
    if (stopPrevBtn) stopPrevBtn.style.display = previewing ? 'block' : 'none';

    if (btn) {
      btn.style.display = cameraConnected ? 'block' : 'none';
      btn.className = `btn ${recording ? 'btn-danger' : 'btn-primary'}`;
      btn.style.background = recording ? '#da3633' : '';
      btn.style.borderColor = recording ? '#f85149' : '';
      btn.style.opacity = (!recording && !readyToRecord) ? '0.55' : '';
      btn.disabled = recording ? false : !readyToRecord;
      const label = recording ? t('rec.stop') : previewing ? t('rec.start_real') : t('rec.start');
      const icon = recording
        ? `<span style="display:inline-block;width:14px;height:14px;background:#fff;border-radius:2px;margin-right:8px;vertical-align:middle"></span>`
        : `<span style="display:inline-block;width:14px;height:14px;background:#fff;border-radius:50%;margin-right:8px;vertical-align:middle"></span>`;
      btn.innerHTML = icon + label;
    }

    // Hint line
    const hint = el('rec-hint');
    if (hint) {
      if (recording) {
        hint.innerHTML = `● ${t('rec.in_progress')}`; hint.style.color = '#3fb950'; hint.style.animation = 'pulse 1.5s infinite';
      } else if (previewing) {
        hint.textContent = t('rec.previewing'); hint.style.color = '#58a6ff'; hint.style.animation = '';
      } else if (!readyToRecord) {
        // Glove is optional now, so the only thing that blocks recording is a
        // missing camera.
        hint.style.animation = ''; hint.style.color = '#484f58';
        hint.textContent = t('rec.need_camera');
      } else {
        hint.textContent = ''; hint.style.animation = '';
      }
    }
  }

  async function startLivePreview() {
    if (_liveBusy || _recBusy) return;
    _liveBusy = true;
    const b = el('rec-live-btn');
    if (b) { b.disabled = true; b.textContent = t('rec.live_starting'); }
    try {
      const r = await api('POST', '/api/camera/live/start');
      if (!r.ok) toast(t('rec.err'));
    } catch(e) { toast(t('rec.err')); }
    finally { _liveBusy = false; if (b) b.disabled = false; }
    await refreshRecordUI();
  }

  async function stopLivePreview() {
    if (_liveBusy || _recBusy) return;
    _liveBusy = true;
    stopPreviewRefresh();
    const b = el('rec-stop-preview-btn');
    if (b) { b.disabled = true; b.textContent = t('rec.live_stopping'); }
    try { await api('POST', '/api/camera/live/stop'); }
    catch(e) { /* ignore */ }
    finally { _liveBusy = false; if (b) { b.disabled = false; b.textContent = t('rec.live_stop'); } }
    await refreshRecordUI();
  }

  async function toggleRecord() {
    if (_recBusy || _liveBusy) return;
    _recBusy = true;
    const wasRecording = _recStatus && _recStatus.recording;
    const btn = el('rec-btn');
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    try {
      const r = await api('POST', '/api/record/toggle');
      if (!r.ok) { toast(t('rec.err')); }
      else {
        toast(wasRecording ? t('rec.stopped') : t('rec.started'));
        // Hold the button until the physical state settles, so it never flashes
        // back to the previous label during guidaview's ~2-3s start/stop window.
        const want = !wasRecording;   // start -> true (promote too); stop -> false
        for (let i = 0; i < 10; i++) {
          await new Promise(rr => setTimeout(rr, 700));
          try { _recStatus = await api('GET', '/api/record/status'); } catch(e) {}
          if (!!(_recStatus && _recStatus.recording) === want) break;
        }
      }
    } catch(e) {
      toast(t('rec.err'));
    } finally {
      _recBusy = false;
    }
    await refreshRecordUI();
  }

  function refreshPreview() {
    const img = el('rec-preview-img');
    const hint = el('rec-preview-hint');
    if (img) {
      if (hint) hint.style.display = 'none';
      img.style.display = 'block';
      img.src = `/api/camera/preview?t=${Date.now()}`;
    }
  }

  function stopPreviewRefresh() {
    if (_previewTimer) { clearInterval(_previewTimer); _previewTimer = null; }
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  function showModal(title, bodyHtml, actions) {
    el('modal-title').textContent = title;
    el('modal-body').innerHTML = bodyHtml;
    el('modal-actions').innerHTML = actions.map((a, i) =>
      `<button class="btn ${a.cls || ''}" style="flex:1" id="modal-action-${i}">${a.label}</button>`
    ).join('');
    actions.forEach((a, i) => {
      el(`modal-action-${i}`).addEventListener('click', a.action);
    });
    el('modal-overlay').classList.remove('hidden');
  }
  function closeModal() {
    el('modal-overlay').classList.add('hidden');
  }

  // ── On-screen keyboard (touch) ──────────────────────────────────────────────
  // A self-contained QWERTY/symbol keyboard for password entry on the kiosk
  // touchscreen (Chromium kiosk has no system on-screen keyboard).  Writes
  // directly into a bound <input>.
  const Keyboard = (() => {
    let _target = null, _shift = false, _layer = 'abc', _onChange = null;
    const LAYERS = {
      abc: ['1 2 3 4 5 6 7 8 9 0',
            'q w e r t y u i o p',
            'a s d f g h j k l',
            '⇧ z x c v b n m ⌫',
            '?123 space done'],
      sym: ['1 2 3 4 5 6 7 8 9 0',
            '! @ # $ % & * ( ) -',
            '_ = + / : ; , . ?',
            "⇧ ~ ' \" | \\ < > ⌫",
            'abc space done'],
    };
    function render(container) {
      if (!container) return;
      container.innerHTML = '';
      LAYERS[_layer].forEach(row => {
        const rowEl = document.createElement('div');
        rowEl.className = 'kbd-row';
        row.split(' ').forEach(k => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'kbd-key';
          let label = k;
          if (k === 'space')           { btn.classList.add('kbd-space'); label = ''; }
          else if (k === '⌫')          { btn.classList.add('kbd-wide'); }
          else if (k === '⇧')          { btn.classList.add('kbd-wide'); if (_shift) btn.classList.add('kbd-active'); }
          else if (k === '?123' || k === 'abc') { btn.classList.add('kbd-wide'); }
          else if (k === 'done')       { btn.classList.add('kbd-wide', 'kbd-done'); label = t('wifi.kbd_done'); }
          else if (_shift && /[a-z]/.test(k)) label = k.toUpperCase();
          btn.textContent = label;
          btn.addEventListener('click', (e) => { e.preventDefault(); press(k, container); });
          rowEl.appendChild(btn);
        });
        container.appendChild(rowEl);
      });
    }
    function press(k, container) {
      if (!_target) return;
      if      (k === '⌫')    { _target.value = _target.value.slice(0, -1); }
      else if (k === 'space'){ _target.value += ' '; }
      else if (k === '⇧')    { _shift = !_shift; render(container); return; }
      else if (k === '?123') { _layer = 'sym'; render(container); return; }
      else if (k === 'abc')  { _layer = 'abc'; render(container); return; }
      else if (k === 'done') { if (_onChange) _onChange('done'); return; }
      else                   { _target.value += (_shift && /[a-z]/.test(k)) ? k.toUpperCase() : k; }
      if (_onChange) _onChange('change');
    }
    function attach(targetEl, containerEl, onChange) {
      _target = targetEl; _shift = false; _layer = 'abc'; _onChange = onChange || null;
      render(containerEl);
    }
    return { attach };
  })();

  // Inject the keyboard + WiFi-password styles once (keeps style.css untouched).
  function injectKbdStyles() {
    if (document.getElementById('kbd-styles')) return;
    const css = `
.wifi-pwd-row { display:flex; gap:8px; align-items:center; margin-bottom:8px; }
.wifi-pwd-row .input { flex:1; height:50px; font-size:19px; }
.pwd-eye { flex:0 0 auto; width:56px; height:50px; border-radius:8px; border:1px solid #30363d;
           background:#21262d; color:#8b949e; font-size:24px; cursor:pointer; }
.pwd-eye.on { color:#3fb950; border-color:#3fb950; }
.wifi-cstatus { min-height:18px; font-size:14px; margin-bottom:6px; color:#8b949e; display:flex;
                align-items:center; gap:6px; }
.wifi-cstatus.err { color:#f85149; }
.wifi-cstatus.ok  { color:#3fb950; }
.kbd { display:flex; flex-direction:column; gap:8px; user-select:none; touch-action:manipulation; }
.kbd-row { display:flex; gap:8px; justify-content:center; }
.kbd-key { flex:1 1 0; min-width:0; height:auto; min-height:50px; border-radius:9px; border:1px solid #30363d;
           background:#21262d; color:#e6edf3; font-size:23px; line-height:1; padding:0; cursor:pointer; }
.kbd-key:active { background:#388bfd; border-color:#388bfd; color:#fff; }
.kbd-key.kbd-wide { flex:1.6 1 0; font-size:17px; }
.kbd-key.kbd-space { flex:4 1 0; }
.kbd-key.kbd-active { background:rgba(56,139,253,0.25); border-color:#388bfd; }
.kbd-key.kbd-done { flex:1.7 1 0; background:#238636; border-color:#238636; color:#fff; }
/* Full-screen keyboard modal: keys flex to fill the height so the Connect
   button is never pushed off-screen on the short 800x480 panel. */
#modal-box:has(.kbd) { width:98vw; max-width:98vw; height:96vh; max-height:96vh;
                       padding:14px 14px 12px; display:flex; flex-direction:column; box-sizing:border-box; }
#modal-box:has(.kbd) #modal-title { margin-bottom:8px; }
#modal-box:has(.kbd) #modal-body { margin-bottom:10px; flex:1 1 auto; min-height:0;
                                   display:flex; flex-direction:column; }
#modal-box:has(.kbd) .kbd { flex:1 1 auto; min-height:0; }
#modal-box:has(.kbd) .kbd-row { flex:1 1 0; }
#modal-box:has(.kbd) #modal-actions .btn { height:50px; font-size:18px; }`;
    const el_ = document.createElement('style');
    el_.id = 'kbd-styles';
    el_.textContent = css;
    document.head.appendChild(el_);
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    injectKbdStyles();
    applyI18n();
    tickClock();
    setInterval(tickClock, 10000);
    startPoll();
    renderHome();
    handleCalReturn();
    // Clean up a live-preview recording if the page is closed mid-preview.
    window.addEventListener('beforeunload', () => {
      if (_recStatus && _recStatus.previewing && navigator.sendBeacon) {
        navigator.sendBeacon('/api/camera/live/stop');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    nav, toggleLang, closeModal,
    wifiScan, wifiConnect, wifiDisconnect,
    btScan, btToggle, btToggleSide, btConnect, btReconnect,
    deleteFile, decodeFile, transferFile, openRecording, toggleCalibrator, startCalibrateMode,
    toggleRecord, refreshPreview, startLivePreview, stopLivePreview,
    togglePostProcess,
  };
})();
