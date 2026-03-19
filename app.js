/* ─── QR_GEN v3.0 — app.js ───────────────────────────────── */
/* Usa qr-code-styling para formas reales y legibles           */

(function () {
  "use strict";

  var DEBOUNCE = 500;

  var HINTS = {
    url:     "escaneable con cualquier cámara",
    text:    "texto plano codificado",
    contact: "vCard 3.0 compatible",
    wifi:    "compatible con iOS & Android",
  };

  /* ── State ───────────────────────────────────────────────── */
  var currentTab      = "url";
  var currentValue    = "";
  var currentDotShape = "square";
  var currentCornerSq = "square";
  var currentCornerDt = "square";
  var customOpen      = false;
  var isDark          = true;
  var timer           = null;
  var qrInstance      = null;   // QRCodeStyling instance

  /* ── DOM ─────────────────────────────────────────────────── */
  var html        = document.documentElement;
  var tabs        = document.querySelectorAll(".tab");
  var panels      = document.querySelectorAll(".panel");
  var qrContainer = document.getElementById("qr-container");
  var qrEmpty     = document.getElementById("qr-empty");
  var actionsEl   = document.getElementById("actions");
  var hintEl      = document.getElementById("hint");
  var btnDl       = document.getElementById("btn-download");
  var btnCopy     = document.getElementById("btn-copy");
  var ctToggle    = document.getElementById("customize-toggle");
  var ctBody      = document.getElementById("customize-body");
  var ctArrow     = document.getElementById("ct-arrow");
  var themeBtn    = document.getElementById("theme-toggle");
  var themeIcon   = document.getElementById("theme-icon");
  var themeLabel  = document.getElementById("theme-label");
  var fgPick      = document.getElementById("c-fg");
  var fgHex       = document.getElementById("c-fg-hex");
  var bgPick      = document.getElementById("c-bg");
  var bgHex       = document.getElementById("c-bg-hex");
  var sizeEl      = document.getElementById("c-size");
  var eccEl       = document.getElementById("c-ecc");
  var dotsBtns    = document.querySelectorAll("#dots-grid .shape-btn");
  var cornerBtns  = document.querySelectorAll(".corner-btn");
  var presets     = document.querySelectorAll(".preset");

  /* ── Theme ───────────────────────────────────────────────── */
  themeBtn.addEventListener("click", function () {
    isDark = !isDark;
    html.setAttribute("data-theme", isDark ? "dark" : "light");
    themeIcon.textContent  = isDark ? "☀" : "☾";
    themeLabel.textContent = isDark ? "Modo claro" : "Modo oscuro";
    schedule();
  });

  /* ── Build data value ────────────────────────────────────── */
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
        return ["BEGIN:VCARD","VERSION:3.0","FN:"+name,
          phone?"TEL:"+phone:null, email?"EMAIL:"+email:null, org?"ORG:"+org:null,
          "END:VCARD"].filter(Boolean).join("\n");
      }
      case "wifi": {
        var ssid = (document.getElementById("w-ssid").value || "").trim();
        if (!ssid) return "";
        return "WIFI:T:"+(document.getElementById("w-sec").value)+";S:"+ssid+";P:"+(document.getElementById("w-pass").value||"")+";;";
      }
    }
    return "";
  }

  /* ── Build QRCodeStyling options ─────────────────────────── */
  function buildOptions(value, size) {
    var eccMap = { L:"L", M:"M", Q:"Q", H:"H" };
    return {
      width:  size,
      height: size,
      type: "canvas",
      data: value,
      margin: Math.round(size * 0.04),
      qrOptions: {
        errorCorrectionLevel: eccMap[eccEl.value] || "M",
      },
      dotsOptions: {
        color: fgPick.value,
        type:  currentDotShape,   // square | rounded | dots | classy | classy-rounded | extra-rounded
      },
      backgroundOptions: {
        color: bgPick.value,
      },
      cornersSquareOptions: {
        color: fgPick.value,
        type:  currentCornerSq,   // square | extra-rounded
      },
      cornersDotOptions: {
        color: fgPick.value,
        type:  currentCornerDt,   // square | dot | rounded
      },
    };
  }

  /* ── Render QR (preview at 180px) ────────────────────────── */
  function renderQR() {
    var value = buildValue();
    currentValue = value;

    if (!value) {
      qrContainer.classList.add("hidden");
      qrEmpty.classList.remove("hidden");
      actionsEl.classList.add("hidden");
      hintEl.classList.add("hidden");
      return;
    }

    qrEmpty.classList.add("hidden");
    qrContainer.classList.remove("hidden");

    var opts = buildOptions(value, 180);

    if (!qrInstance) {
      // First render: create instance and append canvas
      qrInstance = new QRCodeStyling(opts);
      qrContainer.innerHTML = "";
      qrInstance.append(qrContainer);
    } else {
      // Update existing instance
      qrInstance.update(opts);
    }

    actionsEl.classList.remove("hidden");
    hintEl.textContent = HINTS[currentTab] || "";
    hintEl.classList.remove("hidden");
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(renderQR, DEBOUNCE);
  }

  /* ── Download PNG ────────────────────────────────────────── */
  btnDl.addEventListener("click", function () {
    if (!currentValue) return;

    var size = parseInt(sizeEl.value, 10) || 500;
    var opts = buildOptions(currentValue, size);
    var dl   = new QRCodeStyling(opts);

    var orig = btnDl.textContent;
    btnDl.textContent = "⏳ Generando…";
    btnDl.disabled = true;

    dl.download({
      name:      "qrcode_" + currentDotShape + "_" + size + "px",
      extension: "png",
    }).then(function () {
      btnDl.textContent = "✓ Descargado";
      btnDl.disabled = false;
      setTimeout(function () { btnDl.textContent = orig; }, 2000);
    }).catch(function () {
      btnDl.textContent = orig;
      btnDl.disabled = false;
    });
  });

  /* ── Copy text ───────────────────────────────────────────── */
  btnCopy.addEventListener("click", function () {
    if (!currentValue) return;
    function done() {
      btnCopy.textContent = "✓ Copiado";
      btnCopy.classList.add("copied");
      setTimeout(function () { btnCopy.textContent = "⧉ Copiar texto"; btnCopy.classList.remove("copied"); }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentValue).then(done).catch(fb);
    } else { fb(); }
    function fb() {
      var ta = document.createElement("textarea");
      ta.value = currentValue; ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch(e) {}
      document.body.removeChild(ta);
    }
  });

  /* ── Tabs ────────────────────────────────────────────────── */
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

  /* ── Field inputs ────────────────────────────────────────── */
  document.querySelectorAll(".field-input").forEach(function (el) {
    el.addEventListener("input",  schedule);
    el.addEventListener("change", schedule);
  });

  /* ── Customize toggle ────────────────────────────────────── */
  ctToggle.addEventListener("click", function () {
    customOpen = !customOpen;
    ctBody.classList.toggle("hidden", !customOpen);
    ctArrow.classList.toggle("open",  customOpen);
  });

  /* ── Dot shape buttons ───────────────────────────────────── */
  dotsBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      dotsBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      currentDotShape = btn.dataset.shape;
      schedule();
    });
  });

  /* ── Corner style buttons ────────────────────────────────── */
  cornerBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      cornerBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      currentCornerSq = btn.dataset.cornerSquare;
      currentCornerDt = btn.dataset.cornerDot;
      schedule();
    });
  });

  /* ── Color pickers ───────────────────────────────────────── */
  function syncColor(picker, hex) {
    picker.addEventListener("input", function () { hex.value = picker.value.toUpperCase(); schedule(); });
    hex.addEventListener("input", function () {
      var v = hex.value;
      if (!v.startsWith("#")) v = "#" + v;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) { picker.value = v.toLowerCase(); schedule(); }
    });
    hex.addEventListener("blur", function () {
      if (!/^#[0-9a-fA-F]{6}$/.test(hex.value)) hex.value = picker.value.toUpperCase();
    });
  }
  syncColor(fgPick, fgHex);
  syncColor(bgPick, bgHex);

  /* ── Presets ─────────────────────────────────────────────── */
  presets.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var fg = "#" + btn.dataset.fg, bg = "#" + btn.dataset.bg;
      fgPick.value = fg; fgHex.value = fg.toUpperCase();
      bgPick.value = bg; bgHex.value = bg.toUpperCase();
      schedule();
    });
  });

  /* ── ECC ─────────────────────────────────────────────────── */
  eccEl.addEventListener("change", schedule);

  /* ── Init ────────────────────────────────────────────────── */
  schedule();

})();
