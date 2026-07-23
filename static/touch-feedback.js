/*
 * Custom touch/pointer feedback overlay for the kiosk touchscreen.
 *
 * Why: Chromium --kiosk on this board shows no visible OS cursor and most
 * elements give zero visual response to a tap until the app's own logic
 * reacts (which can be a beat late under load), so touches can *feel*
 * unresponsive/laggy even when they did register. This draws an immediate
 * ripple + a small "finger dot" the instant the browser sees the pointer
 * event, on a single <canvas> overlay (cheap: no per-touch DOM nodes).
 *
 * This is a perceived-latency fix only. It does NOT and cannot fix actual
 * input-pipeline lag further upstream (kernel evdev -> libinput -> Xorg);
 * see FLASHING_GUIDE.md troubleshooting notes if taps are missed/delayed
 * at the OS level, not just "felt slow".
 *
 * Self-contained; safe to include on any page. Never intercepts input
 * (canvas is pointer-events:none), never throws if canvas is unsupported.
 */
(function () {
  "use strict";
  if (typeof document === "undefined") return;

  function init() {
    var canvas = document.createElement("canvas");
    canvas.id = "touch-fx-layer";
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;z-index:999999;" +
      "pointer-events:none;";
    var ctx;
    try {
      ctx = canvas.getContext("2d");
    } catch (e) {
      return; // no canvas support -> silently do nothing
    }
    if (!ctx) return;
    document.body.appendChild(canvas);

    var dpr = window.devicePixelRatio || 1;
    function resize() {
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    // active[pointerId] = { x, y, downAt }
    var active = Object.create(null);
    // ripples[] = { x, y, t0 }
    var ripples = [];

    var RIPPLE_MS = 320;
    var RIPPLE_MAX_R = 34;
    var DOT_R = 10;
    var ACCENT = "88, 166, 255"; // matches the UI's #58a6ff blue accent

    function spawnRipple(x, y) {
      ripples.push({ x: x, y: y, t0: performance.now() });
      if (ripples.length > 8) ripples.shift(); // cap for safety under multi-touch spam
    }

    function onDown(e) {
      active[e.pointerId] = { x: e.clientX, y: e.clientY };
      spawnRipple(e.clientX, e.clientY);
      ensureLoop();
    }
    function onMove(e) {
      var a = active[e.pointerId];
      if (!a) return;
      a.x = e.clientX;
      a.y = e.clientY;
    }
    function onUp(e) {
      delete active[e.pointerId];
    }

    // Capture phase on document: always sees the event first, regardless of
    // any stopPropagation() further down (e.g. the modal box's own handler).
    document.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    document.addEventListener("pointermove", onMove, { capture: true, passive: true });
    document.addEventListener("pointerup", onUp, { capture: true, passive: true });
    document.addEventListener("pointercancel", onUp, { capture: true, passive: true });

    var looping = false;
    function ensureLoop() {
      if (looping) return;
      looping = true;
      requestAnimationFrame(tick);
    }

    function tick(now) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // fading ripples
      ripples = ripples.filter(function (r) {
        var t = (now - r.t0) / RIPPLE_MS;
        if (t >= 1) return false;
        var r_ = RIPPLE_MAX_R * (0.25 + 0.75 * t);
        var alpha = 0.55 * (1 - t);
        ctx.beginPath();
        ctx.arc(r.x, r.y, r_, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(" + ACCENT + "," + alpha.toFixed(3) + ")";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        return true;
      });

      // live finger dot(s) for anything still pressed/dragging
      var stillActive = false;
      for (var id in active) {
        stillActive = true;
        var a = active[id];
        ctx.beginPath();
        ctx.arc(a.x, a.y, DOT_R, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + ACCENT + ",0.28)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(a.x, a.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + ACCENT + ",0.9)";
        ctx.fill();
      }

      if (ripples.length || stillActive) {
        requestAnimationFrame(tick);
      } else {
        looping = false; // stop the RAF loop when idle so it costs nothing at rest
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
