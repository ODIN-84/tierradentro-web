/* Tableros del equipo (/equipo/...): respaldo propio del sitio, con clave por persona.
   Los tableros vienen de artefactos de Claude y esperan `window.claude.use('db')` y `use('user')`.
   Este archivo les entrega esa misma interfaz, pero guardando en el Apps Script del café (TDE_CONFIG.EQUIPO_API).
   Cada persona entra con su clave: el equipo ve el calendario y lo suyo, y marca solo a su nombre;
   el administrador además guarda el calendario y responde solicitudes. El servidor es el que hace cumplir esto. */
(function () {
  'use strict';
  var CFG = window.TDE_CONFIG || {};
  var API = CFG.EQUIPO_API || 'PENDIENTE';
  // prueba local: scripts/equipo-mock-server.py atiende /api/equipo
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]mock\b/.test(location.search)) API = '/api/equipo';
  var APP = document.documentElement.getAttribute('data-tablero') || 'turnos';
  var K_SESION = 'tde-equipo-sesion', K_ID = 'tde-equipo-id', K_YO = 'turnos-tierradentro-yo';
  var CADA_MS = 30000;
  var sesion = leer(K_SESION), version = -1, docs = {}, oyentes = [], listo = null, temporizador = null;
  var YO = window.TDE_EQUIPO = { rol: null, emp: null };

  function leer(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function guardar(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }
  function idLocal() { var v = leer(K_ID); if (!v) { v = 'd' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); guardar(K_ID, v); } return v; }
  function error(code) { var e = new Error(code); e.code = code; return e; }
  function soy(j) { YO.rol = j.rol; YO.emp = j.emp || null; if (YO.emp) guardar(K_YO, YO.emp); }

  function pedir(cuerpo) {
    if (API === 'PENDIENTE') return Promise.reject(error('unavailable'));
    cuerpo.app = APP; if (cuerpo.accion !== 'entrar') cuerpo.sesion = sesion;
    // text/plain evita la consulta previa (preflight) que Apps Script no responde
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(cuerpo), redirect: 'follow' })
      .then(function (r) { if (!r.ok) throw error('unavailable'); return r.json(); }, function () { throw error('unavailable'); })
      .then(function (j) {
        if (j && j.ok) return j;
        var c = j && j.error;
        throw error(c === 'clave' ? 'revoked' : c === 'bloqueado' ? 'blocked' : c === 'permiso' ? 'not_granted' : c === 'tamano' ? 'quota_exceeded' : 'unavailable');
      });
  }

  /* ---------- puerta: pedir la clave ---------- */
  function puerta(mensaje) {
    return new Promise(function (resolver) {
      var ov = document.createElement('div'); ov.className = 'ov'; ov.id = 'puerta';
      ov.innerHTML = '<form class="dlg" role="dialog" aria-modal="true" aria-labelledby="puerta-t" autocomplete="off">' +
        '<h3 id="puerta-t">Turnos del equipo</h3>' +
        '<p>Escribe tu clave personal. Este dispositivo te recuerda hasta que salgas.</p>' +
        '<label>Tu clave<input id="puerta-clave" type="password" inputmode="numeric" autocomplete="off" spellcheck="false" maxlength="40"></label>' +
        '<p class="dur bad" id="puerta-msg" role="alert">' + (mensaje || '') + '</p>' +
        '<div class="dlg-act"><span class="grow"></span><button class="btn primary" id="puerta-ok">Entrar</button></div></form>';
      document.body.appendChild(ov);
      var inp = ov.querySelector('#puerta-clave'), msg = ov.querySelector('#puerta-msg'), btn = ov.querySelector('#puerta-ok');
      inp.focus();
      ov.querySelector('form').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var v = inp.value.trim(); if (!v) { msg.textContent = 'Escribe tu clave.'; return; }
        btn.disabled = true; btn.textContent = 'Entrando…'; msg.textContent = '';
        pedir({ accion: 'entrar', clave: v }).then(function (j) { sesion = j.sesion; guardar(K_SESION, sesion); soy(j); ov.remove(); resolver(j); }, function (e) {
          btn.disabled = false; btn.textContent = 'Entrar'; inp.value = ''; inp.focus();
          msg.textContent = e.code === 'revoked' ? 'Esa clave no es correcta.'
            : e.code === 'blocked' ? 'Hubo varios intentos fallidos. El ingreso queda bloqueado un rato; avisa al administrador.'
            : API === 'PENDIENTE' ? 'El tablero todavía no está conectado. Avisa al administrador.'
            : 'No hay conexión. Revisa tu internet e intenta de nuevo.';
        });
      });
    });
  }
  function entrar() {
    if (listo) return listo;
    listo = sesion ? pedir({ accion: 'yo' }).then(function (j) { soy(j); return j; }, function (e) {
      if (e.code === 'revoked') { sesion = ''; guardar(K_SESION, ''); guardar(K_YO, ''); return puerta('Tu sesión se cerró. Escribe tu clave otra vez.'); }
      YO.rol = 'equipo'; YO.emp = leer(K_YO) || null; return YO; // sin conexión: se entra y la lectura reintenta sola
    }) : puerta('');
    return listo;
  }

  /* ---------- lectura periódica ---------- */
  function partes(ruta) { var i = ruta.indexOf('/'); return [ruta.slice(0, i), ruta.slice(i + 1)]; }
  function copia(o) { return JSON.parse(JSON.stringify(o)); }
  function fotoDoc(ruta) { var d = docs[ruta]; return { exists: d !== undefined, id: partes(ruta)[1], metadata: { hasPendingWrites: false }, data: function () { return d === undefined ? null : copia(d); } }; }
  function fotoCol(col) {
    var pre = col + '/', filas = [];
    Object.keys(docs).forEach(function (r) { if (r.indexOf(pre) === 0) { var d = docs[r]; filas.push({ id: r.slice(pre.length), data: function () { return copia(d); } }); } });
    return { docs: filas };
  }
  function avisar(o) { try { o.cb(o.tipo === 'doc' ? fotoDoc(o.ruta) : fotoCol(o.ruta)); } catch (e) { setTimeout(function () { throw e; }, 0); } }
  function avisarTodos() { oyentes.forEach(avisar); }
  function fallar(e) { oyentes.forEach(function (o) { if (o.fail && !o.avisado) { try { o.fail(e); } catch (x) {} } }); }
  function leerServidor() {
    return pedir({ accion: 'leer', v: version }).then(function (j) {
      if (!j.igual) { docs = j.docs || {}; version = j.v; }
      oyentes.forEach(function (o) { if (!j.igual || !o.avisado) { o.avisado = true; avisar(o); } });
    }, function (e) {
      if (e.code === 'revoked') { sesion = ''; guardar(K_SESION, ''); location.reload(); return; }
      fallar(e);
    });
  }
  function programar() {
    if (temporizador) return;
    leerServidor();
    temporizador = setInterval(function () { if (!document.hidden) leerServidor(); }, CADA_MS);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) leerServidor(); });
  }
  function escuchar(tipo, ruta, cb, fail) { var o = { tipo: tipo, ruta: ruta, cb: cb, fail: fail, avisado: false }; oyentes.push(o); if (version >= 0) { o.avisado = true; setTimeout(function () { avisar(o); }, 0); } programar(); return function () { oyentes = oyentes.filter(function (x) { return x !== o; }); }; }

  /* ---------- escritura ---------- */
  function escribir(ruta, data) { return pedir({ accion: 'set', ruta: ruta, data: data }).then(function (j) { docs[ruta] = copia(data); version = j.v; avisarTodos(); }); }
  function borrar(ruta) { return pedir({ accion: 'borrar', ruta: ruta }).then(function (j) { delete docs[ruta]; version = j.v; avisarTodos(); }); }
  function refDoc(ruta) {
    return { id: partes(ruta)[1], set: function (data) { return escribir(ruta, data); }, delete: function () { return borrar(ruta); }, onSnapshot: function (cb, fail) { return escuchar('doc', ruta, cb, fail); } };
  }
  var DB = {
    doc: refDoc,
    collection: function (col) {
      return { doc: function (id) { return refDoc(col + '/' + (id || ('x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)))); }, onSnapshot: function (cb, fail) { return escuchar('col', col, cb, fail); } };
    }
  };
  var USER = { isOwner: function () { return entrar().then(function () { return YO.rol === 'admin'; }); }, id: function () { return Promise.resolve(idLocal()); } };

  window.claude = { use: function (n) { return entrar().then(function () { return n === 'db' ? DB : n === 'user' ? USER : null; }); } };

  // "Salir de este dispositivo": cierra la sesión en el servidor y olvida quién eres
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-act="salir"]'); if (!b) return;
    var fin = function () { guardar(K_SESION, ''); guardar(K_YO, ''); location.reload(); };
    pedir({ accion: 'salir' }).then(fin, fin);
  });
})();
