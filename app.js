/* ─── QR_GEN v2.0 — app.js ───────────────────────────────── */

(function () {
  "use strict";

  /* ── Config ──────────────────────────────────────────────── */
  const QR_BASE    = "https://api.qrserver.com/v1/create-qr-code/";
  const DEBOUNCE   = 450;

  /* ── State ───────────────────────────────────────────────── */
  let currentTab   = "url";
  let currentValue = "";
  let timer        = null;
  let customOpen   = false;

  /* ── DOM refs ────────────────────────────────────────────── */
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

  // Color pickers
  const fgPick     = document.getElementById("c-fg");
  const fgHex      = document.getElementById("c-fg-hex");
  const bgPick     = document.getElementById("c-bg");
  const bgHex      = document.getElementById("c-bg-hex");
  const sizeEl     = document.getElementById("c-size");
  const eccEl      = document.getElementById("c-ecc");
  const marginEl   = document.getElementById("c-margin");
  const marginVal  = document.getElementById("c-margin-val");
  const presets    = document.querySelectorAll(".preset");

  /* ── Hints ───────────────────────────────────────────────── */
  const HINTS = {
    url:     "escaneable con cualquier cámara",
    text:    "texto plano codificado",
    contact: "vCard 3.0 compatible",
    wifi:    "compatible con iOS & Android",
  };

  /* ── Helpers ─────────────────────────────────────────────── */
  function hexWithout(hex) {
    // Remove # for API
    return hex.replace(/^#/, "");
  }

  function isValidHex(val) {
    return /^#[0-9a-fA-F]{6}$/.test(val);
  }

  /* ── Build QR data string ────────────────────────────────── */
  function buildValue() {
    switch (currentTab) {
      case "url":
        return document.getElementById("url").value.trim();

      case "text":
        return document.getElementById("text").value.trim();

      case "contact": {
        const name  = document.getElementById("c-name").value.trim();
        const phone = document.getElementById("c-phone").value.trim();
        const email = document.getElementById("c-email").value.trim();
        const org   = document.getElementById("c-org").value.trim();
        if (!name && !phone && !email) return "";
        return [
          "BEGIN:VCARD", "VERSION:3.0",
          "FN:" + name,
          phone ? "TEL:" + phone : null,
          email ? "EMAIL:" + email : null,
          org   ? "ORG:" + org   : null,
          "END:VCARD",
        ].filter(Boolean).join("\n");
      }

      case "wifi": {
        const ssid = document.getElementById("w-ssid").value.trim();
        if (!ssid) return "";
        const pass = document.getElementById("w-pass").value;
        const sec  = document.getElementById("w-sec").value;
        return "WIFI:T:" + sec + ";S:" + ssid + ";P:" + pass + ";;";
      }
    }
    return "";
  }

  /* ── Build API URL ───────────────────────────────────────── */
  function buildURL(value, size, fg, bg, margin, ecc) {
    const params = new URLSearchParams({
      size:    size + "x" + size,
      data:    value,
      color:   hexWithout(fg),
      bgcolor: hexWithout(bg),
      margin:  margin,
      ecc:     ecc,
      format:  "png",
    });
    return QR_BASE + "?" + params.toString();
  }

  /* ── Render QR into canvas ───────────────────────────────── */
  function renderQR() {
    const value  = buildValue();
    currentValue = value;

    if (!value) {
      qrCanvas.classList.add("hidden");
      qrEmpty.classList.remove("hidden");
      actionsEl.classList.add("hidden");
      hintEl.classList.add("hidden");
      return;
    }

    const fg     = fgPick.value;
    const bg     = bgPick.value;
    const margin = marginEl.value;
    const ecc    = eccEl.value;

    // Show loading state
    qrEmpty.classList.add("hidden");
    qrCanvas.classList.remove("hidden");
    qrCanvas.classList.add("qr-loading");

    const url = buildURL(value, 200, fg, bg, margin, ecc);
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = function () {
      const ctx = qrCanvas.getContext("2d");
      qrCanvas.width  = 200;
      qrCanvas.height = 200;
      ctx.drawImage(img, 0, 0, 200, 200);
      qrCanvas.classList.remove("qr-loading");
      actionsEl.classList.remove("hidden");
      hintEl.textContent = HINTS[currentTab] || "";
      hintEl.classList.remove("hidden");
    };

    img.onerror = function () {
      qrCanvas.classList.remove("qr-loading");
      qrCanvas.classList.add("hidden");
      qrEmpty.classList.remove("hidden");
    };

    img.src = url;
  }

  /* ── Schedule update ─────────────────────────────────────── */
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(renderQR, DEBOUNCE);
  }

  /* ── Download PNG via Canvas ─────────────────────────────── */
  btnDl.addEventListener("click", function () {
    if (!currentValue) return;

    const size   = parseInt(sizeEl.value, 10);
    const fg     = fgPick.value;
    const bg     = bgPick.value;
    const margin = marginEl.value;
    const ecc    = eccEl.value;

    btnDl.textContent = "⏳ Generando…";
    btnDl.classList.add("downloading");
    btnDl.disabled = true;

    const url = buildURL(currentValue, size, fg, bg, margin, ecc);
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = function () {
      // Draw into an offscreen canvas at full resolution
      const offscreen = document.createElement("canvas");
      offscreen.width  = size;
      offscreen.height = size;
      const ctx = offscreen.getContext("2d");
      ctx.drawImage(img, 0, 0, size, size);

      // Convert to blob and trigger real download
      offscreen.toBlob(function (blob) {
        const objectURL = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectURL;
        a.download = "qrcode_" + size + "px_" + Date.now() + ".png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(objectURL); }, 5000);

        btnDl.textContent = "✓ Descargado";
        btnDl.disabled = false;
        btnDl.classList.remove("downloading");
        setTimeout(function () { btnDl.textContent = "↓ Descargar PNG"; }, 2000);
      }, "image/png");
    };

    img.onerror = function () {
      btnDl.textContent = "↓ Descargar PNG";
      btnDl.disabled = false;
      btnDl.classList.remove("downloading");
      alert("No se pudo descargar. Verificá tu conexión.");
    };

    img.src = url;
  });

  /* ── Copy text ───────────────────────────────────────────── */
  btnCopy.addEventListener("click", function () {
    if (!currentValue) return;

    function onSuccess() {
      btnCopy.textContent = "✓ Copiado";
      btnCopy.classList.add("copied");
      setTimeout(function () {
        btnCopy.textContent = "⧉ Copiar texto";
        btnCopy.classList.remove("copied");
      }, 1800);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentValue).then(onSuccess).catch(fallback);
    } else {
      fallback();
    }

    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = currentValue;
      ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); onSuccess(); } catch(e) {}
      document.body.removeChild(ta);
    }
  });

  /* ── Tab switching ───────────────────────────────────────── */
  tabs.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const tab = btn.dataset.tab;
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

  /* ── Field inputs ────────────────────────────────────────── */
  document.querySelectorAll(".field-input").forEach(function (el) {
    // Skip color hex inputs (handled separately) and customize selects
    el.addEventListener("input", schedule);
    el.addEventListener("change", schedule);
  });

  /* ── Customize toggle ────────────────────────────────────── */
  ctToggle.addEventListener("click", function () {
    customOpen = !customOpen;
    ctBody.classList.toggle("hidden", !customOpen);
    ctArrow.classList.toggle("open", customOpen);
  });

  /* ── Color pickers sync ──────────────────────────────────── */
  function syncColor(picker, hexInput) {
    picker.addEventListener("input", function () {
      hexInput.value = picker.value.toUpperCase();
      schedule();
    });
    hexInput.addEventListener("input", function () {
      var val = hexInput.value;
      if (!val.startsWith("#")) val = "#" + val;
      if (isValidHex(val)) {
        picker.value = val.toLowerCase();
        schedule();
      }
    });
    hexInput.addEventListener("blur", function () {
      if (!isValidHex(hexInput.value)) {
        hexInput.value = picker.value.toUpperCase();
      }
    });
  }
  syncColor(fgPick, fgHex);
  syncColor(bgPick, bgHex);

  /* ── Margin slider ───────────────────────────────────────── */
  marginEl.addEventListener("input", function () {
    marginVal.textContent = marginEl.value;
    schedule();
  });

  /* ── ECC select ──────────────────────────────────────────── */
  eccEl.addEventListener("change", schedule);

  /* ── Size select (no re-render needed, only affects download) */
  // sizeEl change does not need to re-render preview

  /* ── Presets ─────────────────────────────────────────────── */
  presets.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var fg = "#" + btn.dataset.fg;
      var bg = "#" + btn.dataset.bg;
      fgPick.value  = fg;
      fgHex.value   = fg.toUpperCase();
      bgPick.value  = bg;
      bgHex.value   = bg.toUpperCase();
      schedule();
    });
  });

  /* ── Init ────────────────────────────────────────────────── */
  schedule();

})();
