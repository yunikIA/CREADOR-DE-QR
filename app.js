/* ─── QR_GEN v3.0 — app.js ───────────────────────────────── */
/* Genera QR 100% local con canvas + formas personalizadas    */

(function () {
  "use strict";

  /* ── Constants ───────────────────────────────────────────── */
  const DEBOUNCE = 400;
  const HINTS = {
    url:     "escaneable con cualquier cámara",
    text:    "texto plano codificado",
    contact: "vCard 3.0 compatible",
    wifi:    "compatible con iOS & Android",
  };

  /* ── State ───────────────────────────────────────────────── */
  let currentTab   = "url";
  let currentValue = "";
  let currentShape = "square";
  let timer        = null;
  let customOpen   = false;
  let isDark       = true;

  /* ── DOM refs ────────────────────────────────────────────── */
  const html       = document.documentElement;
  const tabs       = document.querySelectorAll(".tab");
  const panels     = document.querySelectorAll(".panel");
  const qrCanvas   = document.getElementById("qr-canvas");
  const qrEmpty    = document.getElementById("qr-empty");
  const actionsEl  = document.getElementById("actions");
  const hintEl     = document.getElementById("hint");
  const btnDl      = document.getElementById("btn-download");
  const btnCopy    = document.getElementById("btn-copy");
  const ctToggle   = document.getElementById("customize-toggle");
  const ctBody     = document.getElementById("customize-body");
  const ctArrow    = document.getElementById("ct-arrow");
  const themeBtn   = document.getElementById("theme-toggle");
  const themeIcon  = document.getElementById("theme-icon");
  const themeLabel = document.getElementById("theme-label");
  const fgPick     = document.getElementById("c-fg");
  const fgHex      = document.getElementById("c-fg-hex");
  const bgPick     = document.getElementById("c-bg");
  const bgHex      = document.getElementById("c-bg-hex");
  const sizeEl     = document.getElementById("c-size");
  const eccEl      = document.getElementById("c-ecc");
  const shapeBtns  = document.querySelectorAll(".shape-btn");
  const presets    = document.querySelectorAll(".preset");

  /* ──────────────────────────────────────────────────────────
     THEME TOGGLE
  ────────────────────────────────────────────────────────── */
  themeBtn.addEventListener("click", function () {
    isDark = !isDark;
    html.setAttribute("data-theme", isDark ? "dark" : "light");
    themeIcon.textContent  = isDark ? "☀" : "☾";
    themeLabel.textContent = isDark ? "Modo claro" : "Modo oscuro";
    // Re-render QR so colors still match if using custom colors
    schedule();
  });

  /* ──────────────────────────────────────────────────────────
     BUILD QR DATA VALUE
  ────────────────────────────────────────────────────────── */
  function buildValue() {
    switch (currentTab) {
      case "url":
        return (document.getElementById("url").value || "").trim();
      case "text":
        return (document.getElementById("text").value || "").trim();
      case "contact": {
        var name  = (document.getElementById("c-name").value  || "").trim();
        var phone = (document.getElementById("c-phone").value || "").trim();
        var email = (document.getElementById("c-email").value || "").trim();
        var org   = (document.getElementById("c-org").value   || "").trim();
        if (!name && !phone && !email) return "";
        return ["BEGIN:VCARD","VERSION:3.0",
          "FN:" + name,
          phone ? "TEL:" + phone : null,
          email ? "EMAIL:" + email : null,
          org   ? "ORG:" + org : null,
          "END:VCARD"
        ].filter(Boolean).join("\n");
      }
      case "wifi": {
        var ssid = (document.getElementById("w-ssid").value || "").trim();
        if (!ssid) return "";
        var pass = document.getElementById("w-pass").value || "";
        var sec  = document.getElementById("w-sec").value;
        return "WIFI:T:" + sec + ";S:" + ssid + ";P:" + pass + ";;";
      }
    }
    return "";
  }

  /* ──────────────────────────────────────────────────────────
     QR MATRIX — uses qrcode.js to get module matrix
  ────────────────────────────────────────────────────────── */
  function getQRMatrix(text, ecc) {
    // qrcode.js exposes QRCode object; we create a hidden div to extract matrix
    var eccMap = { L: QRCode.CorrectLevel.L, M: QRCode.CorrectLevel.M, Q: QRCode.CorrectLevel.Q, H: QRCode.CorrectLevel.H };
    var tmp = document.createElement("div");
    tmp.style.cssText = "position:absolute;left:-9999px;visibility:hidden;";
    document.body.appendChild(tmp);
    try {
      var qr = new QRCode(tmp, {
        text: text,
        width: 256, height: 256,
        correctLevel: eccMap[ecc] || QRCode.CorrectLevel.M,
      });
      // Extract the internal matrix from qrcode.js internals
      var qrObj = qr._oQRCode;
      var count = qrObj.getModuleCount();
      var matrix = [];
      for (var r = 0; r < count; r++) {
        matrix[r] = [];
        for (var c = 0; c < count; c++) {
          matrix[r][c] = qrObj.isDark(r, c);
        }
      }
      return matrix;
    } catch(e) {
      return null;
    } finally {
      document.body.removeChild(tmp);
    }
  }

  /* ──────────────────────────────────────────────────────────
     SHAPE DRAWERS
     Each receives: ctx, x, y, size (cell size in px), padding
  ────────────────────────────────────────────────────────── */
  var Shapes = {

    square: function (ctx, x, y, s) {
      var p = s * 0.08;
      ctx.fillRect(x + p, y + p, s - p*2, s - p*2);
    },

    rounded: function (ctx, x, y, s) {
      var p  = s * 0.08;
      var r  = (s - p*2) * 0.38;
      var x0 = x + p, y0 = y + p, w = s - p*2, h = s - p*2;
      ctx.beginPath();
      ctx.moveTo(x0 + r, y0);
      ctx.arcTo(x0+w, y0,   x0+w, y0+h, r);
      ctx.arcTo(x0+w, y0+h, x0,   y0+h, r);
      ctx.arcTo(x0,   y0+h, x0,   y0,   r);
      ctx.arcTo(x0,   y0,   x0+w, y0,   r);
      ctx.closePath();
      ctx.fill();
    },

    circle: function (ctx, x, y, s) {
      var p  = s * 0.1;
      var cx = x + s / 2;
      var cy = y + s / 2;
      var r  = (s - p*2) / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    },

    diamond: function (ctx, x, y, s) {
      var p  = s * 0.1;
      var cx = x + s / 2;
      var cy = y + s / 2;
      var r  = s / 2 - p;
      ctx.beginPath();
      ctx.moveTo(cx,     cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx,     cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill();
    },

    star: function (ctx, x, y, s) {
      var cx    = x + s / 2;
      var cy    = y + s / 2;
      var outer = s / 2 * 0.85;
      var inner = outer * 0.42;
      var pts   = 5;
      ctx.beginPath();
      for (var i = 0; i < pts * 2; i++) {
        var angle = (i * Math.PI / pts) - Math.PI / 2;
        var r     = (i % 2 === 0) ? outer : inner;
        var px    = cx + r * Math.cos(angle);
        var py    = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    },

    heart: function (ctx, x, y, s) {
      var cx = x + s / 2;
      var cy = y + s / 2;
      var w  = s * 0.82;
      var h  = s * 0.82;
      var ox = cx - w / 2;
      var oy = cy - h / 2 + h * 0.1;
      ctx.beginPath();
      ctx.moveTo(cx, oy + h * 0.8);
      // Left curve
      ctx.bezierCurveTo(
        ox,             oy + h * 0.5,
        ox,             oy,
        cx - w * 0.01,  oy + h * 0.25
      );
      // Top left bump
      ctx.bezierCurveTo(
        ox + w * 0.15,  oy - h * 0.12,
        cx,             oy + h * 0.05,
        cx,             oy + h * 0.28
      );
      // Top right bump
      ctx.bezierCurveTo(
        cx,             oy + h * 0.05,
        ox + w * 0.85,  oy - h * 0.12,
        cx + w * 0.01,  oy + h * 0.25
      );
      // Right curve
      ctx.bezierCurveTo(
        ox + w,         oy,
        ox + w,         oy + h * 0.5,
        cx,             oy + h * 0.8
      );
      ctx.closePath();
      ctx.fill();
    },

    leaf: function (ctx, x, y, s) {
      var p  = s * 0.1;
      var x0 = x + p, y0 = y + p;
      var w  = s - p*2, h = s - p*2;
      ctx.beginPath();
      ctx.moveTo(x0 + w/2, y0);
      ctx.bezierCurveTo(x0 + w, y0,       x0 + w, y0 + h,   x0 + w/2, y0 + h);
      ctx.bezierCurveTo(x0,     y0 + h,   x0,     y0,       x0 + w/2, y0);
      ctx.closePath();
      ctx.fill();
    },

    cross: function (ctx, x, y, s) {
      var p  = s * 0.1;
      var t  = (s - p*2) * 0.3; // arm thickness ratio
      var cx = x + s/2, cy = y + s/2;
      var hs = s/2 - p;
      ctx.beginPath();
      ctx.rect(cx - t/2, cy - hs, t, hs*2);
      ctx.rect(cx - hs,  cy - t/2, hs*2, t);
      ctx.fill();
    },
  };

  /* ──────────────────────────────────────────────────────────
     DRAW QR ON CANVAS
  ────────────────────────────────────────────────────────── */
  function drawQR(matrix, canvas, fgColor, bgColor, shape, canvasSize) {
    var count   = matrix.length;
    var padding = Math.round(canvasSize * 0.04);
    var cell    = Math.floor((canvasSize - padding * 2) / count);
    var total   = cell * count;
    var offX    = Math.round((canvasSize - total) / 2);
    var offY    = offX;

    canvas.width  = canvasSize;
    canvas.height = canvasSize;
    var ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Modules
    ctx.fillStyle = fgColor;
    var drawFn = Shapes[shape] || Shapes.square;

    for (var r = 0; r < count; r++) {
      for (var c = 0; c < count; c++) {
        if (matrix[r][c]) {
          drawFn(ctx, offX + c * cell, offY + r * cell, cell);
        }
      }
    }
  }

  /* ──────────────────────────────────────────────────────────
     RENDER QR (preview)
  ────────────────────────────────────────────────────────── */
  function renderQR() {
    var value = buildValue();
    currentValue = value;

    if (!value) {
      qrCanvas.classList.add("hidden");
      qrEmpty.classList.remove("hidden");
      actionsEl.classList.add("hidden");
      hintEl.classList.add("hidden");
      return;
    }

    var ecc   = eccEl.value;
    var fg    = fgPick.value;
    var bg    = bgPick.value;

    qrEmpty.classList.add("hidden");
    qrCanvas.classList.remove("hidden");
    qrCanvas.classList.add("qr-loading");

    var matrix = getQRMatrix(value, ecc);
    if (!matrix) {
      qrCanvas.classList.add("hidden");
      qrEmpty.classList.remove("hidden");
      return;
    }

    drawQR(matrix, qrCanvas, fg, bg, currentShape, 350);
    qrCanvas.classList.remove("qr-loading");
    actionsEl.classList.remove("hidden");
    hintEl.textContent = HINTS[currentTab] || "";
    hintEl.classList.remove("hidden");
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(renderQR, DEBOUNCE);
  }

  /* ──────────────────────────────────────────────────────────
     DOWNLOAD PNG (real blob download)
  ────────────────────────────────────────────────────────── */
  btnDl.addEventListener("click", function () {
    if (!currentValue) return;

    var size   = parseInt(sizeEl.value, 10) || 500;
    var ecc    = eccEl.value;
    var fg     = fgPick.value;
    var bg     = bgPick.value;
    var shape  = currentShape;

    var matrix = getQRMatrix(currentValue, ecc);
    if (!matrix) { alert("No se pudo generar el QR."); return; }

    var offscreen = document.createElement("canvas");
    drawQR(matrix, offscreen, fg, bg, shape, size);

    offscreen.toBlob(function (blob) {
      var url = URL.createObjectURL(blob);
      var a   = document.createElement("a");
      a.href  = url;
      a.download = "qrcode_" + shape + "_" + size + "px.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);

      var orig = btnDl.textContent;
      btnDl.textContent = "✓ Descargado";
      setTimeout(function () { btnDl.textContent = orig; }, 2000);
    }, "image/png");
  });

  /* ──────────────────────────────────────────────────────────
     COPY TEXT
  ────────────────────────────────────────────────────────── */
  btnCopy.addEventListener("click", function () {
    if (!currentValue) return;
    function done() {
      btnCopy.textContent = "✓ Copiado";
      btnCopy.classList.add("copied");
      setTimeout(function () { btnCopy.textContent = "⧉ Copiar texto"; btnCopy.classList.remove("copied"); }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentValue).then(done).catch(fallback);
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = currentValue;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch(e) {}
      document.body.removeChild(ta);
    }
  });

  /* ──────────────────────────────────────────────────────────
     TABS
  ────────────────────────────────────────────────────────── */
  tabs.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var tab = btn.dataset.tab;
      if (tab === currentTab) return;
      tabs.forEach(function (t) { t.classList.remove("active"); });
      btn.classList.add("active");
      panels.forEach(function (p) { p.classList.remove("active"); });
      var panel = document.getElementById("panel-" + tab);
      if (panel) panel.classList.add("active");
      currentTab = tab;
      schedule();
    });
  });

  /* ──────────────────────────────────────────────────────────
     FIELD INPUTS
  ────────────────────────────────────────────────────────── */
  document.querySelectorAll(".field-input").forEach(function (el) {
    el.addEventListener("input",  schedule);
    el.addEventListener("change", schedule);
  });

  /* ──────────────────────────────────────────────────────────
     CUSTOMIZE TOGGLE
  ────────────────────────────────────────────────────────── */
  ctToggle.addEventListener("click", function () {
    customOpen = !customOpen;
    ctBody.classList.toggle("hidden", !customOpen);
    ctArrow.classList.toggle("open",  customOpen);
  });

  /* ──────────────────────────────────────────────────────────
     SHAPE BUTTONS
  ────────────────────────────────────────────────────────── */
  shapeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      shapeBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      currentShape = btn.dataset.shape;
      schedule();
    });
  });

  /* ──────────────────────────────────────────────────────────
     COLOR PICKERS
  ────────────────────────────────────────────────────────── */
  function syncColor(picker, hex) {
    picker.addEventListener("input", function () {
      hex.value = picker.value.toUpperCase();
      schedule();
    });
    hex.addEventListener("input", function () {
      var v = hex.value;
      if (!v.startsWith("#")) v = "#" + v;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        picker.value = v.toLowerCase();
        schedule();
      }
    });
    hex.addEventListener("blur", function () {
      if (!/^#[0-9a-fA-F]{6}$/.test(hex.value)) {
        hex.value = picker.value.toUpperCase();
      }
    });
  }
  syncColor(fgPick, fgHex);
  syncColor(bgPick, bgHex);

  /* ──────────────────────────────────────────────────────────
     PRESETS
  ────────────────────────────────────────────────────────── */
  presets.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var fg = "#" + btn.dataset.fg;
      var bg = "#" + btn.dataset.bg;
      fgPick.value = fg; fgHex.value = fg.toUpperCase();
      bgPick.value = bg; bgHex.value = bg.toUpperCase();
      schedule();
    });
  });

  /* ──────────────────────────────────────────────────────────
     ECC change
  ────────────────────────────────────────────────────────── */
  eccEl.addEventListener("change", schedule);

  /* ──────────────────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────────────────── */
  schedule();

})();
