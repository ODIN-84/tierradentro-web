/* Horario vivo y fiesta del último viernes (landing).
 *
 * - #estado: "Abierto · cierra a las 21:00" / "Cerrado · abre mañana a las 8:00", con hora de Colombia (UTC-5, sin horario de verano).
 *   Lunes a sábado 8:00–21:00; domingos y festivos 10:00–19:00; cerrado 25 de diciembre y 1 de enero.
 *   Festivos según la Ley 51 de 1983 (Ley Emiliani), calculados para cualquier año.
 * - Marca con .hoy la fila del horario que aplica hoy.
 * - #noches: fecha de la próxima fiesta de salsa (último viernes del mes) y el detalle de TDE_CONFIG.NOCHES.especiales.
 * - #mall: línea de cómo encontrar el local dentro del mall (TDE_CONFIG.COMO_LLEGAR_MALL; si está vacía no se muestra).
 */
(function () {
  "use strict";
  var cfg = window.TDE_CONFIG || {};
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  // Fechas como Date en UTC a medianoche: así no interviene la zona horaria del teléfono.
  function d(y, m, dd) { return new Date(Date.UTC(y, m, dd)); }
  function mas(f, n) { return new Date(f.getTime() + n * 864e5); }
  function clave(f) { return f.toISOString().slice(0, 10); }
  function lunesSiguiente(f) { var w = f.getUTCDay(); return w === 1 ? f : mas(f, (8 - w) % 7); }

  function pascua(y) { // algoritmo de Meeus/Jones/Butcher
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, e = Math.floor(b / 4), g = b % 4,
        f = Math.floor((b + 8) / 25), h = Math.floor((b - f + 1) / 3),
        i = (19 * a + b - e - h + 15) % 30, k = Math.floor(c / 4), l = c % 4,
        m = (32 + 2 * g + 2 * k - i - l) % 7, n = Math.floor((a + 11 * i + 22 * m) / 451),
        mes = Math.floor((i + m - 7 * n + 114) / 31), dia = ((i + m - 7 * n + 114) % 31) + 1;
    return d(y, mes - 1, dia);
  }

  var cache = {};
  function festivos(y) {
    if (cache[y]) return cache[y];
    var s = {}, p = pascua(y);
    [d(y, 0, 1), d(y, 4, 1), d(y, 6, 20), d(y, 7, 7), d(y, 11, 8), d(y, 11, 25),
     mas(p, -3), mas(p, -2)].forEach(function (f) { s[clave(f)] = 1; });
    [d(y, 0, 6), d(y, 2, 19), d(y, 5, 29), d(y, 7, 15), d(y, 9, 12), d(y, 10, 1), d(y, 10, 11),
     mas(p, 39), mas(p, 60), mas(p, 68)].forEach(function (f) { s[clave(lunesSiguiente(f))] = 1; });
    return (cache[y] = s);
  }

  // Horario de un día: [abre, cierra] en minutos, o null si cierra.
  function horario(f) {
    var m = f.getUTCMonth(), dd = f.getUTCDate();
    if ((m === 11 && dd === 25) || (m === 0 && dd === 1)) return null;
    if (f.getUTCDay() === 0 || festivos(f.getUTCFullYear())[clave(f)]) return [600, 1140];
    return [480, 1260];
  }
  function hhmm(min) { return Math.floor(min / 60) + ":" + ("0" + (min % 60)).slice(-2); }

  function ultimoViernes(y, m) {
    var f = d(y, m + 1, 0); // último día del mes
    return mas(f, -((f.getUTCDay() + 2) % 7));
  }

  // "Ahora" en Colombia
  var ahora = new Date(Date.now() - 5 * 3600e3);
  var hoy = d(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate());
  var min = ahora.getUTCHours() * 60 + ahora.getUTCMinutes();

  // Próxima fiesta: último viernes de este mes; si ya pasó, el del mes siguiente.
  var fiesta = ultimoViernes(hoy.getUTCFullYear(), hoy.getUTCMonth());
  if (fiesta < hoy) fiesta = ultimoViernes(hoy.getUTCFullYear() + (hoy.getUTCMonth() === 11 ? 1 : 0), (hoy.getUTCMonth() + 1) % 12);
  var noches = cfg.NOCHES || {};
  var hayFiestaHoy = clave(fiesta) === clave(hoy);

  // --- Estado abierto / cerrado ----------------------------------------------
  var est = document.getElementById("estado");
  if (est) {
    var h = horario(hoy), abierto = false, txt;
    if (h && min >= h[0] && min < h[1]) {
      abierto = true;
      txt = (h[1] - min <= 60 ? "Abierto · cierra pronto, a las " : "Abierto · cierra a las ") + hhmm(h[1]);
    } else if (hayFiestaHoy && h && min >= h[1]) {
      abierto = true;
      txt = "Hoy hay fiesta de salsa desde las " + (noches.hora || "9:00 p. m.");
    } else if (h && min < h[0]) {
      txt = "Cerrado · abre hoy a las " + hhmm(h[0]);
    } else {
      for (var i = 1; i <= 7; i++) {
        var f = mas(hoy, i), hf = horario(f);
        if (!hf) continue;
        txt = "Cerrado · abre " + (i === 1 ? "mañana" : "el " + DIAS[f.getUTCDay()]) + " a las " + hhmm(hf[0]);
        break;
      }
    }
    if (txt) { est.textContent = txt; est.classList.toggle("on", abierto); est.hidden = false; }
  }

  // --- Fila del horario que aplica hoy ----------------------------------------
  var hh = horario(hoy);
  var fila = document.querySelector(hh && hh[0] === 600 ? '[data-dia="domingo"]' : '[data-dia="semana"]');
  if (fila && hh) fila.classList.add("hoy");

  // --- Fiesta del último viernes ----------------------------------------------
  var fe = document.getElementById("noches-fecha");
  if (fe) {
    var esp = (noches.especiales || {})[clave(fiesta)] || {};
    fe.textContent = !horario(fiesta) && !esp.hora
      // El último viernes cae en día de cierre (25 de diciembre): la fecha se anuncia aparte.
      ? "La fecha de " + MESES[fiesta.getUTCMonth()] + " la anunciamos en Instagram"
      : (hayFiestaHoy ? "Hoy, " : "Próxima: ") + "viernes " + fiesta.getUTCDate() + " de " + MESES[fiesta.getUTCMonth()] +
        " · " + (esp.hora || noches.hora || "9:00 p. m.");
    var nom = document.getElementById("noches-nombre");
    if (nom && esp.nombre) { nom.textContent = esp.nombre; nom.hidden = false; }
    var det = document.getElementById("noches-detalle");
    if (det && esp.detalle) { det.textContent = esp.detalle; det.hidden = false; }
    var wa = document.getElementById("noches-wa");
    if (wa && cfg.WHATSAPP) {
      wa.href = "https://wa.me/" + cfg.WHATSAPP + "?text=" + encodeURIComponent(
        "Hola, quiero apartar mesa para la fiesta de salsa del viernes " + fiesta.getUTCDate() + " de " + MESES[fiesta.getUTCMonth()] + ".");
    }
  }

  // --- Cómo encontrar el local dentro del mall --------------------------------
  var mall = document.getElementById("mall");
  if (mall && cfg.COMO_LLEGAR_MALL) { mall.textContent = cfg.COMO_LLEGAR_MALL; mall.hidden = false; }

  window.tdeHorario = { festivos: festivos, horario: horario, ultimoViernes: ultimoViernes };
})();
