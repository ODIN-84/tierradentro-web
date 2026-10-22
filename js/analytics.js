/* Analítica del sitio Tierradentro Café Express (GA4).
 *
 * Eventos que envía (además de los automáticos de GA4: page_view, scroll 90 %, clics salientes, etc.):
 *
 *   qr_scan          qr_location    Llegada por código QR (enlaces con ?utm_source=qr&utm_medium=qr&utm_content=<mesa|vitrina|...>)
 *   select_category  category       Toque en la barra de categorías de la carta
 *   view_category    category       Una categoría de la carta entró a la pantalla (una vez por visita)
 *   view_item        item_name, item_category, price, items[]   Abrió la foto de un producto
 *   photo_nav        item_name, direction                        Pasó a otra foto dentro del visor
 *   scroll_depth     percent, page_type                          25 / 50 / 75 / 100 % de la página
 *   cta_click        cta, page_type                              Botones: ver_carta, whatsapp, como_llegar, resena, instagram, inicio
 *   view_section     section                                     Sección de la landing visible (una vez por visita)
 *   time_on_page     seconds, page_type                          30 s, 60 s, 120 s, 300 s en la página
 *
 * Todos los eventos llevan page_type = "landing" | "carta" (desde <body data-page>).
 * Para que category, cta, section, qr_location, percent, direction y page_type aparezcan en los informes,
 * hay que registrarlos como dimensiones personalizadas en GA4 (Administrar → Definiciones personalizadas).
 */
(function () {
  "use strict";
  var cfg = window.TDE_CONFIG || {};
  var GA_ID = cfg.GA_ID || "PENDIENTE";
  var pageType = document.body.getAttribute("data-page") || "otro";
  var activo = /^G-[A-Z0-9]+$/.test(GA_ID);

  // --- gtag ---------------------------------------------------------------
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  if (activo) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", GA_ID, { page_type: pageType, send_page_view: true });
  } else if (window.console) {
    console.info("[TDE analytics] GA_ID no configurado (js/config.js). Los eventos solo se muestran aquí.");
  }

  function track(nombre, params) {
    params = params || {};
    params.page_type = pageType;
    if (activo) { gtag("event", nombre, params); }
    else if (window.console) { console.log("[TDE analytics]", nombre, params); }
  }
  window.tdeTrack = track;

  // --- Llegada por QR -------------------------------------------------------
  try {
    var q = new URLSearchParams(location.search);
    if ((q.get("utm_source") || "").toLowerCase() === "qr") {
      track("qr_scan", { qr_location: q.get("utm_content") || "sin_ubicacion", campaign: q.get("utm_campaign") || "" });
    }
  } catch (e) {}

  // --- Profundidad de scroll ------------------------------------------------
  var marcas = [25, 50, 75, 100], enviadas = {};
  function scroll() {
    var h = document.documentElement, total = h.scrollHeight - h.clientHeight;
    if (total <= 0) return;
    var pct = Math.round(((window.scrollY || h.scrollTop) / total) * 100);
    marcas.forEach(function (m) {
      if (pct >= m && !enviadas[m]) { enviadas[m] = true; track("scroll_depth", { percent: m }); }
    });
  }
  window.addEventListener("scroll", scroll, { passive: true });

  // --- Tiempo en página -----------------------------------------------------
  [30, 60, 120, 300].forEach(function (seg) {
    setTimeout(function () { if (document.visibilityState !== "hidden") track("time_on_page", { seconds: seg }); }, seg * 1000);
  });

  // --- Botones y enlaces marcados con data-track -----------------------------
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-track]");
    if (!el) return;
    var cta = el.getAttribute("data-track");
    track("cta_click", { cta: cta, link_url: el.getAttribute("href") || "" });
  }, true);

  // --- Secciones visibles (landing y carta) ----------------------------------
  var vistas = {};
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting || vistas[en.target.id]) return;
        vistas[en.target.id] = true;
        if (pageType === "carta") track("view_category", { category: en.target.id });
        else track("view_section", { section: en.target.id });
      });
    }, { threshold: 0.35 });
    document.querySelectorAll("section[id]").forEach(function (sec) { io.observe(sec); });
  }

  // --- Específico de la carta -------------------------------------------------
  if (pageType === "carta") {
    document.querySelectorAll(".cats a[data-id]").forEach(function (a) {
      a.addEventListener("click", function () { track("select_category", { category: a.dataset.id }); });
    });

    var ultimo = null;
    document.querySelectorAll(".item.has-photo").forEach(function (li) {
      li.addEventListener("click", function () {
        var b = li.querySelector(".thumb"); if (!b) return;
        var sec = li.closest("section"); var cat = sec ? sec.id : "";
        var precio = parseInt(String(b.dataset.price || "").replace(/[^0-9]/g, "").slice(0, 7), 10) || 0;
        ultimo = b.dataset.name;
        track("view_item", {
          item_name: b.dataset.name, item_category: cat, price: precio, currency: "COP",
          items: [{ item_name: b.dataset.name, item_category: cat, price: precio, quantity: 1 }]
        });
      });
    });
    var prev = document.getElementById("lbPrev"), next = document.getElementById("lbNext");
    if (prev) prev.addEventListener("click", function () { track("photo_nav", { item_name: ultimo || "", direction: "anterior" }); });
    if (next) next.addEventListener("click", function () { track("photo_nav", { item_name: ultimo || "", direction: "siguiente" }); });
  }
})();
