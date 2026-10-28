/**
 * Reservas de mesas · Fiesta de salsa · Tierradentro Café Express
 * Respaldo de datos para https://tierradentroexpress.com/reservas (clientes) y /reservas/admin (café).
 *
 * Es un Google Apps Script de la cuenta del café que escribe en la hoja de cálculo "Reservas fiesta de salsa" (SHEET_ID).
 * Sirve igual como proyecto independiente (script.google.com → Nuevo proyecto) o vinculado a la hoja (Extensiones → Apps Script).
 * Puesta en marcha (una sola vez, 5 minutos): ver scripts/reservas-apps-script/LEEME.md
 *   1. Crear una hoja de cálculo nueva llamada "Reservas fiesta de salsa".
 *   2. Extensiones → Apps Script → pegar este archivo completo en Code.gs → guardar.
 *   3. Ejecutar la función `setup` (botón ▶) y autorizar. Crea las pestañas, siembra las 39 mesas y escribe la clave de administración.
 *   4. Implementar → Nueva implementación → Aplicación web → Ejecutar como: Yo · Acceso: Cualquier persona → Implementar.
 *   5. Copiar la URL (termina en /exec) en js/config.js del sitio: RESERVAS_API.
 *
 * Pestañas: mesas (una fila por mesa), config (clave / valor), solicitudes (bitácora de lo que piden los clientes).
 * Estados de una mesa: libre · solicitada (la pidió un cliente, por confirmar) · reservada · confirmada · llego.
 * La clave de administración vive en las propiedades del script (ADMIN_KEY) y se copia en la pestaña config para que el café la vea.
 */

// ID de la hoja "Reservas fiesta de salsa" del Drive del café (en su URL). Permite que el script viva como proyecto independiente.
const SHEET_ID = '13rNgnPZZGCJLkhx4N-9hSA078BV8Oka4QhS3iv7XvuA';
function ss_() { const a = SpreadsheetApp.getActive(); return a || SpreadsheetApp.openById(SHEET_ID); }
const CAMPOS = ['id', 'num', 'forma', 'zona', 'x', 'y', 'rot', 'asientos', 'grupo', 'estado', 'nombre', 'personas', 'tel', 'nota', 'act'];
const ESTADOS = ['libre', 'solicitada', 'reservada', 'confirmada', 'llego'];
const CONFIG_DEF = { nombre: 'Fiesta de salsa', fecha: 'Viernes 30 de octubre de 2026', hora: '9:00 p. m. a 3:00 a. m.', aforo: 250, sentados: 204, abierto: 'si', horas_espera: 48, whatsapp: '573146551487' };
// Las 39 mesas del Plan de Contingencia v2 (la genera scripts/construir-plano-salsa.py; no editar a mano)
const SEMILLA = [{"id": "m01", "num": "1", "forma": "cuadrada", "zona": "A", "x": 340, "y": 226, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m02", "num": "2", "forma": "cuadrada", "zona": "A", "x": 390, "y": 226, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m03", "num": "3", "forma": "cuadrada", "zona": "A", "x": 340, "y": 358, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m04", "num": "4", "forma": "cuadrada", "zona": "A", "x": 390, "y": 358, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m05", "num": "5", "forma": "cuadrada", "zona": "A", "x": 340, "y": 452, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m06", "num": "6", "forma": "cuadrada", "zona": "A", "x": 390, "y": 452, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m07", "num": "7", "forma": "cuadrada", "zona": "A", "x": 340, "y": 548, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m08", "num": "8", "forma": "cuadrada", "zona": "A", "x": 390, "y": 548, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m09", "num": "9", "forma": "redonda", "zona": "B", "x": 465, "y": 200, "rot": 0, "asientos": 4, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m10", "num": "10", "forma": "redonda", "zona": "B", "x": 532, "y": 232, "rot": 0, "asientos": 4, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m11", "num": "11", "forma": "redonda", "zona": "B", "x": 598, "y": 232, "rot": 0, "asientos": 4, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m12", "num": "12", "forma": "redonda", "zona": "B", "x": 664, "y": 232, "rot": 0, "asientos": 4, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m13", "num": "13", "forma": "redonda", "zona": "B", "x": 730, "y": 228, "rot": 0, "asientos": 4, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m14", "num": "14", "forma": "barra", "zona": "B", "x": 822, "y": 222, "rot": 0, "asientos": 8, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m15", "num": "15", "forma": "redonda", "zona": "C", "x": 752, "y": 108, "rot": 0, "asientos": 4, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m16", "num": "16", "forma": "redonda", "zona": "C", "x": 812, "y": 100, "rot": 0, "asientos": 4, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m17", "num": "17", "forma": "redonda", "zona": "C", "x": 858, "y": 126, "rot": 0, "asientos": 4, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m18", "num": "18", "forma": "redonda", "zona": "D", "x": 534, "y": 350, "rot": 0, "asientos": 4, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m19", "num": "19", "forma": "redonda", "zona": "D", "x": 597, "y": 348, "rot": 0, "asientos": 4, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m20", "num": "20", "forma": "redonda", "zona": "D", "x": 650, "y": 350, "rot": 0, "asientos": 4, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m21", "num": "21", "forma": "redonda", "zona": "D", "x": 702, "y": 360, "rot": 0, "asientos": 4, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m22", "num": "22", "forma": "redonda", "zona": "D", "x": 750, "y": 390, "rot": 0, "asientos": 4, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m23", "num": "23", "forma": "redonda", "zona": "D", "x": 797, "y": 412, "rot": 0, "asientos": 4, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m24", "num": "24", "forma": "redonda", "zona": "D", "x": 478, "y": 412, "rot": 0, "asientos": 4, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m25", "num": "25", "forma": "redonda", "zona": "D", "x": 462, "y": 492, "rot": 0, "asientos": 4, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m26", "num": "26", "forma": "cuadrada", "zona": "E", "x": 1101, "y": 363, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m27", "num": "27", "forma": "cuadrada", "zona": "E", "x": 1101, "y": 413, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m28", "num": "28", "forma": "cuadrada", "zona": "E", "x": 1186, "y": 363, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m29", "num": "29", "forma": "cuadrada", "zona": "E", "x": 1186, "y": 413, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m30", "num": "30", "forma": "cuadrada", "zona": "E", "x": 1271, "y": 363, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m31", "num": "31", "forma": "cuadrada", "zona": "E", "x": 1271, "y": 413, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m32", "num": "32", "forma": "cuadrada", "zona": "E", "x": 1356, "y": 363, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m33", "num": "33", "forma": "cuadrada", "zona": "E", "x": 1356, "y": 413, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m34", "num": "34", "forma": "cuadrada", "zona": "E", "x": 1145, "y": 471, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m35", "num": "35", "forma": "cuadrada", "zona": "E", "x": 1145, "y": 521, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m36", "num": "36", "forma": "cuadrada", "zona": "E", "x": 1230, "y": 471, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m37", "num": "37", "forma": "cuadrada", "zona": "E", "x": 1230, "y": 521, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m38", "num": "38", "forma": "cuadrada", "zona": "E", "x": 1356, "y": 471, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}, {"id": "m39", "num": "39", "forma": "cuadrada", "zona": "E", "x": 1356, "y": 521, "rot": 0, "asientos": 6, "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""}];

// ---------- Puesta en marcha ----------
function setup() {
  const ss = ss_();
  const hm = hoja_(ss, 'mesas', CAMPOS);
  if (hm.getLastRow() < 2) escribirMesas_(hm, SEMILLA);
  const hc = hoja_(ss, 'config', ['clave', 'valor']);
  const cfg = leerConfig_(hc);
  Object.keys(CONFIG_DEF).forEach(k => { if (cfg[k] === undefined) cfg[k] = CONFIG_DEF[k]; });
  // La clave del tablero manda desde la fila clave_admin de la pestaña config: para cambiarla, se escribe ahí y se vuelve a ejecutar setup.
  let key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  const enHoja = String(cfg.clave_admin || '').trim();
  if (enHoja && enHoja !== key) { key = enHoja; PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', key); }
  if (!key) { key = claveNueva_(); PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', key); }
  cfg.clave_admin = key;
  escribirConfig_(hc, cfg);
  hoja_(ss, 'solicitudes', ['fecha', 'codigo', 'mesa', 'nombre', 'personas', 'tel', 'resultado']);
  Logger.log('Listo. La clave de administración es la de la fila clave_admin de la pestaña config (' + key.length + ' caracteres).');
}
function claveNueva_() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 10; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
function hoja_(ss, nombre, encabezados) {
  let h = ss.getSheetByName(nombre);
  if (!h) { h = ss.insertSheet(nombre); h.appendRow(encabezados); h.setFrozenRows(1); }
  return h;
}

// ---------- Entradas HTTP ----------
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.accion === 'estado') return json_(estadoPublico_());
  return json_({ ok: true, servicio: 'reservas-tierradentro', uso: '?accion=estado' });
}
function doPost(e) {
  let b = {};
  try { b = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { return json_({ ok: false, error: 'json' }); }
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    if (b.accion === 'solicitar') return json_(solicitar_(b));
    if (!esAdmin_(b.clave)) return json_({ ok: false, error: 'clave' });
    switch (b.accion) {
      case 'estado': return json_(estadoAdmin_());
      case 'guardar': return json_(guardar_([b.mesa]));
      case 'guardar_varias': return json_(guardar_(b.mesas || []));
      case 'borrar': return json_(borrar_(b.id));
      case 'config': return json_(guardarConfig_(b.config || {}));
      case 'reset': return json_(reset_());
      default: return json_({ ok: false, error: 'accion' });
    }
  } catch (x) {
    return json_({ ok: false, error: 'servidor', detalle: String(x && x.message || x) });
  } finally { try { lock.releaseLock(); } catch (x) {} }
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function esAdmin_(clave) { const k = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY'); return !!k && String(clave || '').trim() === k; }

// ---------- Lecturas ----------
function estadoPublico_() {
  const ss = ss_(); const cfg = leerConfig_(hoja_(ss, 'config', ['clave', 'valor']));
  const mesas = expirar_(leerMesas_(hoja_(ss, 'mesas', CAMPOS)), cfg);
  const pub = mesas.map(m => ({ id: m.id, num: m.num, forma: m.forma, zona: m.zona, x: m.x, y: m.y, rot: m.rot, asientos: m.asientos, grupo: m.grupo, estado: m.estado === 'libre' ? 'libre' : 'reservada' }));
  return { ok: true, publico: true, config: configPublica_(cfg), mesas: pub, hora: new Date().toISOString() };
}
function estadoAdmin_() {
  const ss = ss_(); const cfg = leerConfig_(hoja_(ss, 'config', ['clave', 'valor']));
  const mesas = expirar_(leerMesas_(hoja_(ss, 'mesas', CAMPOS)), cfg);
  delete cfg.clave_admin;
  return { ok: true, publico: false, config: cfg, mesas: mesas, hora: new Date().toISOString() };
}
function configPublica_(cfg) { return { nombre: cfg.nombre, fecha: cfg.fecha, hora: cfg.hora, aforo: cfg.aforo, sentados: cfg.sentados, abierto: cfg.abierto, whatsapp: cfg.whatsapp, horas_espera: cfg.horas_espera }; }
// Una solicitud de cliente que el café no confirma en `horas_espera` horas vuelve a quedar libre
function expirar_(mesas, cfg) {
  const h = +cfg.horas_espera || 0; if (!h) return mesas;
  const limite = Date.now() - h * 3600 * 1000; const cambiadas = [];
  mesas.forEach(m => { if (m.estado === 'solicitada' && m.act && new Date(m.act).getTime() < limite) { m.estado = 'libre'; m.nombre = ''; m.personas = 0; m.tel = ''; m.nota = ''; m.grupo = ''; m.act = new Date().toISOString(); cambiadas.push(m); } });
  if (cambiadas.length) guardar_(cambiadas);
  return mesas;
}

// ---------- Escrituras ----------
function solicitar_(b) {
  const ss = ss_(); const cfg = leerConfig_(hoja_(ss, 'config', ['clave', 'valor']));
  const nombre = String(b.nombre || '').trim().slice(0, 60), personas = Math.round(+b.personas || 0), tel = String(b.tel || '').replace(/\D/g, '').slice(0, 15);
  const hs = hoja_(ss, 'solicitudes', ['fecha', 'codigo', 'mesa', 'nombre', 'personas', 'tel', 'resultado']);
  const log = (codigo, mesaNum, res) => hs.appendRow([new Date(), codigo, mesaNum, nombre, personas, tel, res]);
  if (String(cfg.abierto).toLowerCase() !== 'si') { log('', '', 'cerrado'); return { ok: false, error: 'cerrado' }; }
  if (nombre.length < 2 || personas < 1 || tel.length < 10) { log('', '', 'datos'); return { ok: false, error: 'datos' }; }
  const hm = hoja_(ss, 'mesas', CAMPOS); const mesas = leerMesas_(hm);
  const m = mesas.find(x => x.id === String(b.mesa || ''));
  if (!m) { log('', b.mesa, 'no_existe'); return { ok: false, error: 'no_existe' }; }
  if (m.estado !== 'libre' || m.grupo) { log('', m.num, 'ocupada'); return { ok: false, error: 'ocupada', mesa: m.num }; }
  if (personas > m.asientos) { log('', m.num, 'capacidad'); return { ok: false, error: 'capacidad', asientos: m.asientos }; }
  const codigo = 'TD-' + claveNueva_().slice(0, 4);
  m.estado = 'solicitada'; m.nombre = nombre; m.personas = personas; m.tel = tel; m.nota = 'Solicitud web ' + codigo; m.act = new Date().toISOString();
  guardar_([m]); log(codigo, m.num, 'solicitada');
  return { ok: true, codigo: codigo, mesa: { id: m.id, num: m.num, asientos: m.asientos, zona: m.zona }, config: configPublica_(cfg) };
}
function guardar_(lista) {
  const hm = hoja_(ss_(), 'mesas', CAMPOS); const mesas = leerMesas_(hm); let n = 0;
  (lista || []).forEach(raw => {
    const m = limpiar_(raw); if (!m) return;
    const i = mesas.findIndex(x => x.id === m.id);
    if (i >= 0) mesas[i] = m; else mesas.push(m); n++;
  });
  escribirMesas_(hm, mesas);
  return { ok: true, guardadas: n, mesas: mesas };
}
function borrar_(id) {
  const hm = hoja_(ss_(), 'mesas', CAMPOS); let mesas = leerMesas_(hm);
  mesas = mesas.filter(x => x.id !== String(id || ''));
  mesas.forEach(x => { if (x.grupo === String(id)) { x.grupo = ''; } });
  escribirMesas_(hm, mesas);
  return { ok: true, mesas: mesas };
}
function guardarConfig_(c) {
  const hc = hoja_(ss_(), 'config', ['clave', 'valor']); const cfg = leerConfig_(hc);
  ['nombre', 'fecha', 'hora', 'whatsapp'].forEach(k => { if (c[k] !== undefined) cfg[k] = String(c[k]).slice(0, 120); });
  ['aforo', 'sentados', 'horas_espera'].forEach(k => { if (c[k] !== undefined) cfg[k] = Math.max(0, Math.round(+c[k] || 0)); });
  if (c.abierto !== undefined) cfg.abierto = String(c.abierto).toLowerCase() === 'si' ? 'si' : 'no';
  escribirConfig_(hc, cfg); delete cfg.clave_admin;
  return { ok: true, config: cfg };
}
function reset_() {
  const hm = hoja_(ss_(), 'mesas', CAMPOS);
  escribirMesas_(hm, SEMILLA.map(m => Object.assign({}, m)));
  return { ok: true, mesas: SEMILLA };
}
function limpiar_(raw) {
  if (!raw || !raw.id) return null; const m = {};
  m.id = String(raw.id).slice(0, 40); m.num = String(raw.num == null ? '' : raw.num).slice(0, 10);
  m.forma = ['redonda', 'cuadrada', 'barra'].indexOf(raw.forma) >= 0 ? raw.forma : 'redonda';
  m.zona = ['A', 'B', 'C', 'D', 'E'].indexOf(raw.zona) >= 0 ? raw.zona : 'E';
  m.x = Math.round(+raw.x || 0); m.y = Math.round(+raw.y || 0); m.rot = Math.round(+raw.rot || 0);
  m.asientos = Math.max(1, Math.min(16, Math.round(+raw.asientos || 4)));
  m.grupo = String(raw.grupo || '').slice(0, 40);
  m.estado = ESTADOS.indexOf(raw.estado) >= 0 ? raw.estado : 'libre';
  m.nombre = String(raw.nombre || '').slice(0, 80); m.personas = Math.max(0, Math.round(+raw.personas || 0));
  m.tel = String(raw.tel || '').slice(0, 20); m.nota = String(raw.nota || '').slice(0, 300); m.act = String(raw.act || new Date().toISOString());
  return m;
}

// ---------- Hoja de cálculo ----------
function leerMesas_(h) {
  const n = h.getLastRow(); if (n < 2) return [];
  const filas = h.getRange(2, 1, n - 1, CAMPOS.length).getValues();
  return filas.filter(f => f[0] !== '').map(f => { const m = {}; CAMPOS.forEach((k, i) => { m[k] = f[i]; }); return limpiar_(m); }).filter(Boolean);
}
function escribirMesas_(h, mesas) {
  const n = h.getLastRow(); if (n > 1) h.getRange(2, 1, n - 1, CAMPOS.length).clearContent();
  if (!mesas.length) return;
  h.getRange(2, 1, mesas.length, CAMPOS.length).setValues(mesas.map(m => CAMPOS.map(k => m[k] === undefined ? '' : m[k])));
}
function leerConfig_(h) {
  const n = h.getLastRow(); const cfg = {};
  if (n >= 2) h.getRange(2, 1, n - 1, 2).getValues().forEach(f => { if (f[0] !== '') cfg[String(f[0])] = f[1]; });
  Object.keys(CONFIG_DEF).forEach(k => { if (cfg[k] === undefined || cfg[k] === '') cfg[k] = CONFIG_DEF[k]; });
  cfg.aforo = +cfg.aforo || 0; cfg.sentados = +cfg.sentados || 0; cfg.horas_espera = +cfg.horas_espera || 0;
  cfg.whatsapp = String(cfg.whatsapp); cfg.abierto = String(cfg.abierto).toLowerCase() === 'no' ? 'no' : 'si';
  return cfg;
}
function escribirConfig_(h, cfg) {
  const n = h.getLastRow(); if (n > 1) h.getRange(2, 1, n - 1, 2).clearContent();
  const filas = Object.keys(cfg).map(k => [k, cfg[k]]);
  h.getRange(2, 1, filas.length, 2).setValues(filas);
}
