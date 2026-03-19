/* ─── QR_GEN — app.js ────────────────────────────────────── */

(function () {
  "use strict";

  /* ── Config ──────────────────────────────────────────────── */
  const QR_BASE = "https://api.qrserver.com/v1/create-qr-code/";
  const DEBOUNCE_MS = 420;

  /* ── Elements ────────────────────────────────────────────── */
  const tabs      = document.querySelectorAll(".tab");
  const panels    = document.querySelectorAll(".panel");
  const qrImg     = document.getElementById("qr-img");
  const qrEmpty   = document.getElementById("qr-empty");
  const actions   = document.getElementById("actions");
  const hintEl    = document.getElementById("hint");
  const btnDl     = document.getElementById("btn-download");
  const btnCopy   = document.getElementById("btn-copy");

  /* ── State ───────────────────────────────────────────────── */
  let currentTab = "url";
  let currentQRValue = "";
  let debounceTimer = null;

  /* ── Hints per tab ───────────────────────────────────────── */
  const HINTS = {
    url:     "escaneable con cualquier cámara",
    text:    "texto plano codificado",
    contact: "vCard 3.0 compatible",
    wifi:    "compatible con iOS & Android",
  };

  /* ── Build QR value ──────────────────────────────────────── */
  function buildValue(tab) {
    switch (tab) {
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
          "BEGIN:VCARD",
          "VERSION:3.0",
          `FN:${name}`,
          phone ? `TEL:${phone}` : "",
          email ? `EMAIL:${email}` : "",
          org   ? `ORG:${org}`   : "",
          "END:VCARD",
        ].filter(Boolean).join("\n");
      }

      case "wifi": {
        const ssid = document.getElementById("w-ssid").value.trim();
        if (!ssid) return "";
        const pass = document.getElementById("w-pass").value;
        const sec  = document.getElementById("w-sec").value;
        return `WIFI:T:${sec};S:${ssid};P:${pass};;`;
      }

      default:
        return "";
    }
  }

  /* ── Build API URL ───────────────────────────────────────── */
  function qrURL(value, size) {
    const params = new URLSearchParams({
      size:    `${size}x${size}`,
      data:    value,
      bgcolor: "0d0d0d",
      color:   "f5f0e8",
      margin:  "10",
    });
    return `${QR_BASE}?${params.toString()}`;
  }

  /* ── Render QR ───────────────────────────────────────────── */
  function renderQR(value) {
    currentQRValue = value;

    if (!value) {
      qrImg.classList.add("hidden");
      qrImg.classList.remove("visible", "qr-loading");
      qrEmpty.classList.remove("hidden");
      actions.classList.add("hidden");
      hintEl.classList.add("hidden");
      return;
    }

    // Show loading pulse on empty icon
    qrEmpty.classList.add("hidden");
    qrImg.classList.remove("hidden", "visible");
    qrImg.classList.add("qr-loading");

    const src = qrURL(value, 200);

    const tempImg = new Image();
    tempImg.onload = function () {
      qrImg.src = src;
      qrImg.classList.remove("qr-loading");
      qrImg.classList.add("visible");
      actions.classList.remove("hidden");
      hintEl.textContent = HINTS[currentTab] || "";
      hintEl.classList.remove("hidden");
    };
    tempImg.onerror = function () {
      qrImg.classList.remove("qr-loading");
      qrEmpty.classList.remove("hidden");
      qrImg.classList.add("hidden");
    };
    tempImg.src = src;
  }

  /* ── Schedule update ─────────────────────────────────────── */
  function scheduleUpdate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      renderQR(buildValue(currentTab));
    }, DEBOUNCE_MS);
  }

  /* ── Tab switching ───────────────────────────────────────── */
  tabs.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const tab = btn.dataset.tab;
      if (tab === currentTab) return;

      // Update active tab
      tabs.forEach(function (t) { t.classList.remove("active"); });
      btn.classList.add("active");

      // Update active panel
      panels.forEach(function (p) { p.classList.remove("active"); });
      const panel = document.getElementById("panel-" + tab);
      if (panel) panel.classList.add("active");

      currentTab = tab;
      scheduleUpdate();
    });
  });

  /* ── Input listeners ─────────────────────────────────────── */
  const inputs = document.querySelectorAll(".field-input");
  inputs.forEach(function (el) {
    el.addEventListener("input", scheduleUpdate);
    el.addEventListener("change", scheduleUpdate);
  });

  /* ── Download ────────────────────────────────────────────── */
  btnDl.addEventListener("click", function () {
    if (!currentQRValue) return;
    const url = qrURL(currentQRValue, 400);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qrcode_" + Date.now() + ".png";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  /* ── Copy text ───────────────────────────────────────────── */
  btnCopy.addEventListener("click", function () {
    if (!currentQRValue) return;
    navigator.clipboard.writeText(currentQRValue).then(function () {
      btnCopy.textContent = "✓ Copiado";
      btnCopy.classList.add("copied");
      setTimeout(function () {
        btnCopy.textContent = "⧉ Copiar texto";
        btnCopy.classList.remove("copied");
      }, 1800);
    }).catch(function () {
      // Fallback for browsers without clipboard API
      const ta = document.createElement("textarea");
      ta.value = currentQRValue;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      btnCopy.textContent = "✓ Copiado";
      btnCopy.classList.add("copied");
      setTimeout(function () {
        btnCopy.textContent = "⧉ Copiar texto";
        btnCopy.classList.remove("copied");
      }, 1800);
    });
  });

  /* ── Init ────────────────────────────────────────────────── */
  scheduleUpdate();

})();
