/**
 * Tableros del equipo de Tierradentro Café Express (/equipo/turnos).
 * Respaldo en una hoja de Google de la cuenta del café. Guía paso a paso: LEEME.md de esta carpeta.
 *
 *   1. Crear una hoja de Google nueva ("Equipo Tierradentro") y copiar su ID en SHEET_ID.
 *   2. Pegar este archivo en un proyecto de script.google.com de la cuenta del café.
 *   3. Ejecutar setup (botón ▶) y autorizar. Crea las pestañas docs y personas.
 *   4. Llenar la pestaña personas (una fila por persona: id, nombre, clave, rol) y ejecutar setup otra vez.
 *   5. Implementar → Nueva implementación → Aplicación web → Ejecutar como: yo · Acceso: cualquier usuario.
 *   6. Copiar la URL (termina en /exec) en js/config.js → EQUIPO_API.
 *
 * Pestaña personas: cada persona entra con SU clave (no hay clave compartida).
 *   id     → el mismo id que la persona tiene en el calendario (minúsculas, sin tildes ni espacios); "admin" para el administrador
 *   nombre → solo para que el café sepa de quién es la fila
 *   clave  → la que escribe la persona; no puede repetirse
 *   rol    → equipo | admin
 * El equipo ve el calendario y solo SUS marcas, notas y solicitudes, y solo puede marcar a su nombre.
 * El administrador ve todo, guarda el calendario y responde solicitudes.
 * Cada vez que se cambia la pestaña personas hay que ejecutar setup: valida las claves y cierra todas las sesiones abiertas.
 */
const SHEET_ID = 'PENDIENTE';
const TROZO = 45000;            // una celda admite 50.000 caracteres
const MAX_DOC = 900000;         // tope por documento
const SESION_DIAS = 60;
const FALLOS_15_MIN = 5;        // intentos fallidos seguidos antes de bloquear el ingreso 15 minutos
const FALLOS_DIA = 40;          // tope de intentos fallidos por día
const TABLEROS = {
  turnos: { todas: ['calendario', 'marcas', 'notas', 'solicitudes', 'respuestas'], soloAdmin: ['calendario', 'respuestas'], propias: ['marcas', 'notas', 'solicitudes'] }
};

// Si SHEET_ID queda en 'PENDIENTE', setup crea la hoja "Equipo Tierradentro" en el Drive de la cuenta y guarda su ID en las propiedades del script.
function ss_() {
  const id = SHEET_ID !== 'PENDIENTE' ? SHEET_ID : props_().getProperty('SHEET_ID');
  if (!id) throw new Error('Falta ejecutar setup.');
  return SpreadsheetApp.openById(id);
}
function props_() { return PropertiesService.getScriptProperties(); }
function hoja_(ss, nombre, encabezados) {
  let h = ss.getSheetByName(nombre);
  if (!h) { h = ss.insertSheet(nombre); h.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight('bold'); h.setFrozenRows(1); }
  return h;
}
function normClave_(v) { let s = String(v == null ? '' : v).trim(); if (/^\d{1,3}$/.test(s)) s = ('0000' + s).slice(-4); return s; }
function personas_() {
  const h = hoja_(ss_(), 'personas', ['id', 'nombre', 'clave', 'rol']); const out = [];
  if (h.getLastRow() < 2) return out;
  h.getRange(2, 1, h.getLastRow() - 1, 4).getValues().forEach(function (f) {
    const id = String(f[0]).trim(), clave = normClave_(f[2]); if (!id || !clave) return;
    out.push({ id: id, clave: clave, rol: String(f[3]).trim().toLowerCase() === 'admin' ? 'admin' : 'equipo' });
  });
  return out;
}

function setup() {
  if (SHEET_ID === 'PENDIENTE' && !PropertiesService.getScriptProperties().getProperty('SHEET_ID')) {
    const nueva = SpreadsheetApp.create('Equipo Tierradentro');
    PropertiesService.getScriptProperties().setProperty('SHEET_ID', nueva.getId());
    Logger.log('Hoja creada: ' + nueva.getUrl());
  }
  const ss = ss_();
  hoja_(ss, 'docs', ['ruta', 'actualizado', 'json_1']);
  const hp = hoja_(ss, 'personas', ['id', 'nombre', 'clave', 'rol']);
  hp.getRange('C:C').setNumberFormat('@');   // la clave es texto: conserva los ceros a la izquierda
  const ps = personas_(); const vistas = {};
  ps.forEach(function (p) {
    if (!/^[a-z0-9_]{1,40}$/.test(p.id)) throw new Error('Id no válido en personas: "' + p.id + '" (minúsculas, números y _)');
    if (p.clave.length < 4) throw new Error('La clave de ' + p.id + ' debe tener al menos 4 caracteres.');
    if (vistas[p.clave]) throw new Error('Dos personas tienen la misma clave: ' + vistas[p.clave] + ' y ' + p.id + '.');
    vistas[p.clave] = p.id;
  });
  // el mapa clave → persona vive en las propiedades del script; las sesiones abiertas se cierran
  const pr = props_(); const todo = pr.getProperties();
  Object.keys(todo).forEach(function (k) { if (k.indexOf('S_') === 0 || k.indexOf('F_') === 0) pr.deleteProperty(k); });
  pr.setProperty('PERSONAS', JSON.stringify(ps));
  if (!pr.getProperty('V')) pr.setProperty('V', '1');
  Logger.log('Listo: ' + ps.length + ' personas (' + ps.filter(function (p) { return p.rol === 'admin'; }).length + ' con rol admin). Todas las sesiones quedaron cerradas.');
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet() { return json_({ ok: true, servicio: 'equipo-tierradentro' }); }
function hoyClave_() { return 'F_' + Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd'); }
function tokenNuevo_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); }

function entrar_(b) {
  const cache = CacheService.getScriptCache(); const pr = props_();
  const recientes = Number(cache.get('fallos') || 0), delDia = Number(pr.getProperty(hoyClave_()) || 0);
  if (recientes >= FALLOS_15_MIN || delDia >= FALLOS_DIA) return json_({ ok: false, error: 'bloqueado' });
  const clave = normClave_(b.clave);
  const ps = JSON.parse(pr.getProperty('PERSONAS') || '[]');
  const p = clave ? ps.filter(function (x) { return x.clave === clave; })[0] : null;
  if (!p) {
    cache.put('fallos', String(recientes + 1), 900); pr.setProperty(hoyClave_(), String(delDia + 1));
    return json_({ ok: false, error: 'clave' });
  }
  const t = tokenNuevo_();
  pr.setProperty('S_' + t, JSON.stringify({ id: p.id, rol: p.rol, exp: Date.now() + SESION_DIAS * 864e5 }));
  return json_({ ok: true, sesion: t, rol: p.rol, emp: p.rol === 'admin' ? null : p.id });
}
function sesion_(t) {
  if (!/^[a-f0-9]{64}$/.test(String(t || ''))) return null;
  const raw = props_().getProperty('S_' + t); if (!raw) return null;
  const s = JSON.parse(raw); if (s.exp < Date.now()) { props_().deleteProperty('S_' + t); return null; }
  return s;
}

function doPost(e) {
  let b; try { b = JSON.parse(e.postData.contents); } catch (x) { return json_({ ok: false, error: 'formato' }); }
  const t = TABLEROS[b.app]; if (!t) return json_({ ok: false, error: 'tablero' });
  if (b.accion === 'entrar') return entrar_(b);
  const s = sesion_(b.sesion); if (!s) return json_({ ok: false, error: 'clave' });
  const admin = s.rol === 'admin', emp = admin ? null : s.id;
  if (b.accion === 'salir') { props_().deleteProperty('S_' + b.sesion); return json_({ ok: true }); }
  if (b.accion === 'yo') return json_({ ok: true, rol: s.rol, emp: emp });
  if (b.accion === 'leer') {
    const v = Number(props_().getProperty('V') || 1);
    if (Number(b.v) === v) return json_({ ok: true, rol: s.rol, emp: emp, v: v, igual: true });
    return json_({ ok: true, rol: s.rol, emp: emp, v: v, docs: filtrar_(leerDocs_(b.app, t), t, emp) });
  }
  if (b.accion !== 'set' && b.accion !== 'borrar') return json_({ ok: false, error: 'accion' });
  const m = /^([a-z]+)\/([A-Za-z0-9_-]{1,60})$/.exec(String(b.ruta || ''));
  if (!m || t.todas.indexOf(m[1]) < 0) return json_({ ok: false, error: 'ruta' });
  if (t.soloAdmin.indexOf(m[1]) >= 0 && !admin) return json_({ ok: false, error: 'permiso' });
  let texto = '';
  if (b.accion === 'set') {
    if (!b.data || typeof b.data !== 'object' || Array.isArray(b.data)) return json_({ ok: false, error: 'formato' });
    if (!admin && t.propias.indexOf(m[1]) >= 0 && b.data.emp !== emp) return json_({ ok: false, error: 'permiso' });
    texto = JSON.stringify(b.data); if (texto.length > MAX_DOC) return json_({ ok: false, error: 'tamano' });
  }
  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (x) { return json_({ ok: false, error: 'ocupado' }); }
  try {
    const h = hoja_(ss_(), 'docs', ['ruta', 'actualizado', 'json_1']);
    const ruta = b.app + '/' + b.ruta;
    const filas = h.getLastRow() > 1 ? h.getRange(2, 1, h.getLastRow() - 1, h.getLastColumn()).getValues() : [];
    const i = filas.map(function (f) { return String(f[0]); }).indexOf(ruta);
    if (!admin && i >= 0 && t.propias.indexOf(m[1]) >= 0) {   // nadie pisa ni borra lo de otra persona
      let previo = {}; try { previo = JSON.parse(filas[i].slice(2).join('')); } catch (x) {}
      if (previo.emp !== emp) return json_({ ok: false, error: 'permiso' });
    }
    if (b.accion === 'borrar') { if (i >= 0) h.deleteRow(i + 2); }
    else {
      const trozos = []; for (let p = 0; p < texto.length; p += TROZO) trozos.push(texto.slice(p, p + TROZO));
      const fila = [ruta, new Date().toISOString()].concat(trozos);
      const n = i >= 0 ? i + 2 : h.getLastRow() + 1;
      if (i >= 0) h.getRange(n, 1, 1, Math.max(h.getLastColumn(), fila.length)).clearContent();
      h.getRange(n, 1, 1, fila.length).setNumberFormat('@').setValues([fila]);
    }
    const v = Number(props_().getProperty('V') || 1) + 1; props_().setProperty('V', String(v));
    return json_({ ok: true, v: v });
  } finally { lock.releaseLock(); }
}

function leerDocs_(app, t) {
  const h = hoja_(ss_(), 'docs', ['ruta', 'actualizado', 'json_1']); const out = {};
  if (h.getLastRow() < 2) return out;
  const pre = app + '/';
  h.getRange(2, 1, h.getLastRow() - 1, h.getLastColumn()).getValues().forEach(function (f) {
    const ruta = String(f[0]); if (ruta.indexOf(pre) !== 0) return;
    const r = ruta.slice(pre.length); if (t.todas.indexOf(r.split('/')[0]) < 0) return;
    try { out[r] = JSON.parse(f.slice(2).join('')); } catch (x) {}
  });
  return out;
}
// El equipo recibe el calendario y solo lo suyo; las respuestas, solo las de sus solicitudes.
function filtrar_(docs, t, emp) {
  if (!emp) return docs;
  const out = {};
  Object.keys(docs).forEach(function (r) {
    const col = r.split('/')[0], id = r.split('/')[1];
    if (t.propias.indexOf(col) >= 0) { if (docs[r].emp === emp) out[r] = docs[r]; }
    else if (col === 'respuestas') { const sol = docs['solicitudes/' + id]; if (sol && sol.emp === emp) out[r] = docs[r]; }
    else out[r] = docs[r];
  });
  return out;
}
