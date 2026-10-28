/* Plano de la fiesta de salsa · Tierradentro Café Express
 * Módulo compartido por /reservas (clientes) y /reservas/admin (café).
 * Dibuja el piso PB del Mall Primavera Life a escala del Anexo 1 del Plan de Contingencia (viewBox 2000×800),
 * las mesas con sus sillas, y maneja pan, zoom, pellizco y arrastre.
 * Inventario del plan v2 (2026-10-26): 16 redondas de 4 + 1 barra de 8 + 22 cuadradas de 6 = 39 mesas, 204 puestos.
 * El bloque FONDO se genera con scripts/construir-plano-salsa.py a partir del tablero del agente; no editarlo a mano.
 */
window.TDE_PLANO = (function () {
  'use strict';
  const FORMAS = {
    redonda:  { asientos: 4, r: 20,         nombre: 'Redonda 60 cm · 4 sillas',   corto: 'red.' },
    cuadrada: { asientos: 6, w: 50, h: 50,  nombre: 'Cuadrada 80 cm · 6 butacos', corto: 'cuad.' },
    barra:    { asientos: 8, w: 120, h: 40, nombre: 'Barra · 8 sillas',           corto: 'barra' }
  };
  const ZONAS = { A: 'Entrada', B: 'Frente al café', C: 'Dentro del local 110', D: 'Frente a la escalera', E: 'Junto a la pista' };
  const ESTADOS = { libre: 'Libre', solicitada: 'Por confirmar', reservada: 'Reservada', confirmada: 'Confirmada', llego: 'Llegaron' };
  const CON_RESERVA = new Set(['solicitada', 'reservada', 'confirmada', 'llego']);
  const CAMPOS = ['id', 'num', 'forma', 'zona', 'x', 'y', 'rot', 'asientos', 'grupo', 'estado', 'nombre', 'personas', 'tel', 'nota', 'act'];
  function mk(id, num, forma, zona, x, y) {
    return { id, num: String(num), forma, zona, x, y, rot: 0, asientos: FORMAS[forma].asientos, grupo: '', estado: 'libre', nombre: '', personas: 0, tel: '', nota: '', act: '' };
  }
  const DEFAULTS = [
    mk('m01', 1, 'cuadrada', 'A', 340, 226), mk('m02', 2, 'cuadrada', 'A', 390, 226),
    mk('m03', 3, 'cuadrada', 'A', 340, 358), mk('m04', 4, 'cuadrada', 'A', 390, 358),
    mk('m05', 5, 'cuadrada', 'A', 340, 452), mk('m06', 6, 'cuadrada', 'A', 390, 452),
    mk('m07', 7, 'cuadrada', 'A', 340, 548), mk('m08', 8, 'cuadrada', 'A', 390, 548),
    mk('m09', 9, 'redonda', 'B', 465, 200), mk('m10', 10, 'redonda', 'B', 532, 232), mk('m11', 11, 'redonda', 'B', 598, 232), mk('m12', 12, 'redonda', 'B', 664, 232), mk('m13', 13, 'redonda', 'B', 730, 228),
    mk('m14', 14, 'barra', 'B', 822, 222),
    mk('m15', 15, 'redonda', 'C', 752, 108), mk('m16', 16, 'redonda', 'C', 812, 100), mk('m17', 17, 'redonda', 'C', 858, 126),
    mk('m18', 18, 'redonda', 'D', 534, 350), mk('m19', 19, 'redonda', 'D', 597, 348), mk('m20', 20, 'redonda', 'D', 650, 350), mk('m21', 21, 'redonda', 'D', 702, 360),
    mk('m22', 22, 'redonda', 'D', 750, 390), mk('m23', 23, 'redonda', 'D', 797, 412), mk('m24', 24, 'redonda', 'D', 478, 412), mk('m25', 25, 'redonda', 'D', 462, 492),
    mk('m26', 26, 'cuadrada', 'E', 1101, 363), mk('m27', 27, 'cuadrada', 'E', 1101, 413),
    mk('m28', 28, 'cuadrada', 'E', 1186, 363), mk('m29', 29, 'cuadrada', 'E', 1186, 413),
    mk('m30', 30, 'cuadrada', 'E', 1271, 363), mk('m31', 31, 'cuadrada', 'E', 1271, 413),
    mk('m32', 32, 'cuadrada', 'E', 1356, 363), mk('m33', 33, 'cuadrada', 'E', 1356, 413),
    mk('m34', 34, 'cuadrada', 'E', 1145, 471), mk('m35', 35, 'cuadrada', 'E', 1145, 521),
    mk('m36', 36, 'cuadrada', 'E', 1230, 471), mk('m37', 37, 'cuadrada', 'E', 1230, 521),
    mk('m38', 38, 'cuadrada', 'E', 1356, 471), mk('m39', 39, 'cuadrada', 'E', 1356, 521)
  ];
  const CONFIG_DEF = { nombre: 'Fiesta de salsa', fecha: 'Viernes 30 de octubre de 2026', hora: '9:00 p. m. a 3:00 a. m.', aforo: 250, sentados: 204, abierto: 'si', horas_espera: 48 };

  const FONDO = `<defs>
<pattern id="baldosa" width="40" height="40" patternUnits="userSpaceOnUse">
<rect width="40" height="40" fill="var(--p-piso)"/>
<path d="M40 0H0V40" fill="none" stroke="var(--p-piso-junta)" stroke-width="1.2"/>
</pattern>
<pattern id="madera" width="60" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(90)">
<rect width="60" height="12" fill="var(--p-madera)"/>
<path d="M0 11.5H60M30 0V11.5" stroke="var(--p-madera-veta)" stroke-width="1"/>
</pattern>
<pattern id="rayas" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
<rect width="14" height="14" fill="none"/>
<path d="M0 0V14" stroke="var(--p-corredor)" stroke-width="3" opacity=".35"/>
</pattern>
<pattern id="plantas" width="34" height="34" patternUnits="userSpaceOnUse">
<rect width="34" height="34" fill="var(--p-planta2)"/>
<circle cx="9" cy="10" r="7" fill="var(--p-planta)"/><circle cx="25" cy="22" r="8" fill="var(--p-planta)"/><circle cx="24" cy="6" r="4" fill="var(--p-planta)" opacity=".7"/>
</pattern>
<pattern id="exterior" width="30" height="30" patternUnits="userSpaceOnUse">
<rect width="30" height="30" fill="var(--p-exterior)"/>
<circle cx="8" cy="20" r="5" fill="var(--p-planta)" opacity=".45"/><circle cx="22" cy="8" r="4" fill="var(--p-planta)" opacity=".35"/>
</pattern>
</defs>
<g id="fondo">
<rect x="0" y="0" width="2000" height="800" fill="url(#baldosa)"/>
<rect x="0" y="0" width="120" height="800" fill="url(#exterior)"/>
<text class="lbl sm" transform="translate(60 420) rotate(-90)">Exterior · jardín del mall</text>
<!-- Locales y muros -->
<g fill="var(--p-muro)" stroke="var(--p-muro-borde)" stroke-width="2">
<rect x="250" y="45" width="180" height="105"/>
<rect x="905" y="45" width="185" height="105"/>
<rect x="1090" y="45" width="200" height="105"/>
<rect x="1290" y="0" width="710" height="150"/>
<rect x="265" y="615" width="635" height="185"/>
<rect x="1100" y="590" width="600" height="210"/>
<rect x="1780" y="150" width="220" height="180"/>
<rect x="1780" y="330" width="220" height="210"/>
<rect x="1680" y="520" width="320" height="280"/>
</g>
<rect x="915" y="55" width="80" height="85" fill="none" stroke="var(--p-muro-borde)" stroke-width="2"/>
<rect x="1000" y="55" width="80" height="85" fill="none" stroke="var(--p-muro-borde)" stroke-width="2"/>
<path d="M915 55l80 85M995 55l-80 85M1000 55l80 85M1080 55l-80 85" stroke="var(--p-muro-borde)" stroke-width="1" opacity=".6"/>
<text class="lbl sm" x="340" y="92">Montacargas</text><text class="lbl sm" x="340" y="108">basura y aseo</text>
<text class="lbl sm" x="997" y="30">Ascensores</text>
<text class="lbl" x="1190" y="95">111</text><text class="lbl sm" x="1190" y="112">Local comercial</text>
<text class="lbl" x="580" y="705">116B</text><text class="lbl sm" x="580" y="722">Local comercial</text>
<text class="lbl" x="1400" y="690">116A</text><text class="lbl sm" x="1400" y="707">Local comercial</text>
<text class="lbl" x="1890" y="430">114</text><text class="lbl sm" x="1890" y="447">Local comercial</text>
<text class="lbl sm" x="1640" y="80">Locales comerciales</text>
<!-- Local 110: Tierradentro Café Express -->
<rect x="430" y="45" width="470" height="105" fill="var(--surface-raised)" stroke="var(--p-barra)" stroke-width="3"/>
<rect x="435" y="50" width="285" height="24" fill="var(--p-barra)"/>
<rect x="435" y="120" width="245" height="26" fill="var(--p-barra)"/>
<rect x="740" y="50" width="155" height="12" fill="var(--p-barra)" opacity=".5"/>
<text class="lbl sm" x="577" y="66" style="fill:var(--crema)">Barra · máquina de espresso</text>
<text class="lbl sm" x="557" y="137" style="fill:var(--crema)">Vitrina · caja</text>
<text class="lbl" x="605" y="103">110 · Tierradentro Café Express</text>
<!-- Recepción -->
<rect x="110" y="170" width="150" height="300" fill="var(--p-muro)" stroke="var(--p-muro-borde)" stroke-width="2"/>
<path d="M120 180h130M120 200h130M120 220h130M120 240h130M120 400h130M120 420h130M120 440h130M120 460h130" stroke="var(--p-muro-borde)" stroke-width="1.5" opacity=".7"/>
<rect x="128" y="295" width="114" height="46" rx="3" fill="var(--surface-raised)" stroke="var(--p-muro-borde)"/>
<!-- Jardineras y escalera -->
<polygon points="520,420 740,420 830,500 830,580 520,580" fill="url(#plantas)" stroke="var(--p-planta2)" stroke-width="2"/>
<text class="lbl sm" x="640" y="505" style="fill:var(--crema)">Jardineras</text>
<rect x="905" y="465" width="125" height="235" fill="var(--p-muro)" stroke="var(--p-muro-borde)" stroke-width="2"/>
<path id="peldanos" stroke="var(--p-muro-borde)" stroke-width="1.5" fill="none"/>
<text class="lbl sm" x="967" y="590" transform="rotate(-90 967 590)">Escalera a piso 1</text>
<rect x="900" y="700" width="200" height="100" fill="var(--p-muro)" stroke="var(--p-muro-borde)" stroke-width="2"/>
<!-- Pista, tarima, zona técnica -->
<rect x="1395" y="262" width="180" height="320" fill="url(#madera)" stroke="var(--madera)" stroke-width="2"/>
<text class="lbl" x="1485" y="430" transform="rotate(-90 1485 430)" style="fill:var(--carbon);font-size:17px">Pista de baile</text>
<rect x="1580" y="210" width="90" height="190" fill="var(--p-tarima)" stroke="var(--p-muro-borde)" stroke-width="3"/>
<text class="lbl" x="1625" y="310" transform="rotate(-90 1625 310)">Tarima</text>
<rect x="1680" y="165" width="95" height="345" fill="var(--p-tecnica)" stroke="var(--madera)" stroke-width="2"/>
<text class="lbl sm" x="1727" y="340" transform="rotate(-90 1727 340)">Zona técnica · DJ · músico · 4 parlantes · luces</text>
<g fill="var(--carbon)" opacity=".6"><rect x="1690" y="175" width="18" height="26" rx="2"/><rect x="1747" y="175" width="18" height="26" rx="2"/><rect x="1690" y="474" width="18" height="26" rx="2"/><rect x="1747" y="474" width="18" height="26" rx="2"/></g>
<!-- Corredor de evacuación, cableado, extintor y botiquín: retirados del plano a pedido de Carlos (2026-10-27); están en el Anexo 1 del plan de contingencia -->
</g>`;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function lista(mesas) { return mesas instanceof Map ? [...mesas.values()] : (mesas || []); }
  function normalizar(m) {
    const n = Object.assign({}, m);
    n.id = String(n.id || ''); n.num = String(n.num == null ? '' : n.num);
    n.personas = +n.personas || 0; n.asientos = +n.asientos || 0; n.x = +n.x || 0; n.y = +n.y || 0; n.rot = +n.rot || 0;
    n.grupo = typeof n.grupo === 'string' ? n.grupo : ''; n.nombre = n.nombre || ''; n.tel = n.tel || ''; n.nota = n.nota || ''; n.act = n.act || '';
    if (!FORMAS[n.forma]) n.forma = 'redonda'; if (!ESTADOS[n.estado]) n.estado = 'libre'; if (!ZONAS[n.zona]) n.zona = 'E';
    return n;
  }
  function raiz(m, mesas) { if (!m) return null; if (m.grupo && mesas instanceof Map && mesas.has(m.grupo)) return mesas.get(m.grupo); return m; }
  function miembros(m, mesas) { return m ? lista(mesas).filter(o => o.grupo === m.id && o.id !== m.id) : []; }
  function puestosGrupo(m, mesas) { return (m.asientos | 0) + miembros(m, mesas).reduce((s, o) => s + (o.asientos | 0), 0); }
  function etiquetaGrupo(m, mesas) { const ms = miembros(m, mesas); return ms.length ? 'Mesas ' + [m, ...ms].map(o => o.num).join(' + ') : 'Mesa ' + m.num; }

  // Lados de una mesa cuadrada pegados a otra mesa: ahí no se dibujan sillas (así se juntan de a dos como en el croquis)
  function ladosPegados(m, mesas) {
    const F = FORMAS[m.forma]; const out = { N: false, S: false, W: false, E: false };
    for (const o of lista(mesas)) {
      if (o.id === m.id) continue; const G = FORMAS[o.forma]; const ow = G.w || G.r * 2, oh = G.h || G.r * 2;
      const dx = o.x - m.x, dy = o.y - m.y;
      if (Math.abs(dx) < (F.w + ow) / 4 + 8 && dy < 0 && -dy < (F.h + oh) / 2 + 14) out.N = true;
      if (Math.abs(dx) < (F.w + ow) / 4 + 8 && dy > 0 && dy < (F.h + oh) / 2 + 14) out.S = true;
      if (Math.abs(dy) < (F.h + oh) / 4 + 8 && dx < 0 && -dx < (F.w + ow) / 2 + 14) out.W = true;
      if (Math.abs(dy) < (F.h + oh) / 4 + 8 && dx > 0 && dx < (F.w + ow) / 2 + 14) out.E = true;
    }
    return out;
  }
  function sillas(m, mesas) {
    const F = FORMAS[m.forma], n = Math.max(0, Math.min(16, m.asientos | 0)); let out = '';
    const silla = (x, y, a) => `<rect class="silla" x="${(x - 8).toFixed(1)}" y="${(y - 5).toFixed(1)}" width="16" height="10" rx="3" transform="rotate(${a.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    if (m.forma === 'redonda') { const R = F.r + 9; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; out += silla(R * Math.cos(a), R * Math.sin(a), a * 180 / Math.PI + 90); } }
    else if (m.forma === 'cuadrada') {
      const d = F.w / 2 + 8, peg = ladosPegados(m, mesas);
      const sides = [['N', 0, -d, 0], ['S', 0, d, 180], ['W', -d, 0, -90], ['E', d, 0, 90]].filter(s => !peg[s[0]]);
      if (!sides.length) return '';
      for (let i = 0; i < n; i++) { const s = sides[i % sides.length]; const k = Math.floor(i / sides.length); const off = (k === 0 ? 0 : (k % 2 ? -13 : 13)); if (k > 1) break; out += silla(s[1] + (s[3] % 180 === 0 ? off : 0), s[2] + (s[3] % 180 !== 0 ? off : 0), s[3]); }
    } else {
      const ends = Math.min(2, Math.max(0, n - 4)); const rest = n - ends; const top = Math.ceil(rest / 2), bot = rest - top, d = F.h / 2 + 8;
      for (let i = 0; i < top; i++) out += silla(-F.w / 2 + F.w * (i + .5) / top, -d, 0);
      for (let i = 0; i < bot; i++) out += silla(-F.w / 2 + F.w * (i + .5) / bot, d, 180);
      if (ends > 0) out += silla(-F.w / 2 - 8, 0, -90); if (ends > 1) out += silla(F.w / 2 + 8, 0, 90);
    }
    return out;
  }
  // Dibuja todas las mesas en el <g id="mesas">. opts.cliente: sin nombres (solo libre / reservada). opts.sel: id seleccionada.
  function renderMesas(gMesas, mesas, opts) {
    opts = opts || {}; const cliente = !!opts.cliente; let html = '', enlaces = '';
    for (const m of lista(mesas)) {
      const F = FORMAS[m.forma];
      const top = m.forma === 'redonda' ? `<circle class="top" r="${F.r}"/>` : `<rect class="top" x="${-F.w / 2}" y="${-F.h / 2}" width="${F.w}" height="${F.h}" rx="5"/>`;
      const st = cliente && CON_RESERVA.has(m.estado) ? 'reservada' : m.estado;
      const r = raiz(m, mesas), esMiembro = r && r.id !== m.id;
      const selec = opts.sel === m.id || (opts.sel && r && r.id === opts.sel);
      if (esMiembro && !cliente) enlaces += `<line class="enlace" x1="${m.x}" y1="${m.y}" x2="${r.x}" y2="${r.y}"/>`;
      const nom = (m.nombre || '').trim().split(/\s+/).slice(0, 2).join(' ');
      let sub = '';
      if (m.forma === 'cuadrada') {
        let linea = `${m.asientos} p.`;
        if (CON_RESERVA.has(m.estado)) linea = cliente ? 'Reserv.' : (esMiembro ? '+ ' + esc(r.num) : esc(nom.slice(0, 9)) + (m.personas ? ' · ' + m.personas : ''));
        sub = `<text class="in pax" y="15">${linea}</text>`;
        html += `<g class="mesa${selec ? ' sel' : ''}" data-id="${esc(m.id)}" data-st="${st}" transform="translate(${m.x} ${m.y})"><g>${sillas(m, mesas)}${top}</g><text class="num in" y="2">${esc(m.num)}</text>${sub}</g>`;
        continue;
      }
      const yOff = (m.forma === 'redonda' ? F.r : F.h / 2) + 22;
      if (!cliente && CON_RESERVA.has(m.estado)) {
        if (esMiembro) sub = `<text class="nom" y="${yOff}">${esc(nom.slice(0, 18))}</text><text class="pax" y="${yOff + 12}">con la mesa ${esc(r.num)}</text>`;
        else sub = `<text class="nom" y="${yOff}">${esc(nom.slice(0, 18))}</text><text class="pax" y="${yOff + 12}">${m.personas || 0} pers.</text>`;
      } else if (cliente && CON_RESERVA.has(m.estado)) sub = `<text class="pax" y="${yOff}">Reservada</text>`;
      else sub = `<text class="pax" y="${yOff}">${m.asientos} puestos</text>`;
      html += `<g class="mesa${selec ? ' sel' : ''}" data-id="${esc(m.id)}" data-st="${st}" transform="translate(${m.x} ${m.y})"><g transform="rotate(${m.rot || 0})">${sillas(m, mesas)}${top}</g><text class="num" y="7">${esc(m.num)}</text>${sub}</g>`;
    }
    gMesas.innerHTML = `<g id="enlaces">${enlaces}</g>` + html;
  }
  // Monta el fondo en el <svg> y devuelve el <g id="mesas">
  function montar(svg) {
    svg.setAttribute('viewBox', '0 0 2000 800');
    svg.innerHTML = FONDO + '<g id="mesas"></g>';
    let d = ''; for (let y = 480; y < 700; y += 14) d += `M910 ${y}H1025`;
    const p = svg.querySelector('#peldanos'); if (p) p.setAttribute('d', d);
    return svg.querySelector('#mesas');
  }
  // Vista: pan, zoom, pellizco y arrastre de mesas. h.onTap(id|null), h.puedeArrastrar(id) → bool, h.onMover(id,x,y), h.onSoltar(id)
  function crearVista(svg, wrap, h) {
    const vb = { x: 0, y: 0, w: 2000, h: 800 };
    function applyVB() { svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); }
    function fit() {
      const r = wrap.getBoundingClientRect(); const ar = r.width / Math.max(1, r.height);
      if (r.width >= 700 || ar >= 2.5) { vb.x = 0; vb.y = 0; vb.w = 2000; vb.h = 800; }
      else { vb.h = 800; vb.w = Math.max(600, 800 * ar); vb.x = (2000 - vb.w) / 2; vb.y = 0; }
      applyVB();
    }
    function zoomAt(f, cx, cy) { const nw = Math.max(300, Math.min(4000, vb.w * f)); const nh = nw * vb.h / vb.w; vb.x = cx - (cx - vb.x) * nw / vb.w; vb.y = cy - (cy - vb.y) * nh / vb.h; vb.w = nw; vb.h = nh; applyVB(); }
    function centrar(m) { if (!m) return; const inside = m.x > vb.x + 60 && m.x < vb.x + vb.w - 60 && m.y > vb.y + 60 && m.y < vb.y + vb.h - 60; if (!inside) { vb.x = m.x - vb.w / 2; vb.y = m.y - vb.h / 2; applyVB(); } }
    function toSvg(cx, cy) { const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy; const m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 }; return pt.matrixTransform(m.inverse()); }
    svg.addEventListener('wheel', e => { e.preventDefault(); const p = toSvg(e.clientX, e.clientY); zoomAt(e.deltaY > 0 ? 1.12 : 0.89, p.x, p.y); }, { passive: false });
    let lastW = 0; window.addEventListener('resize', () => { const w = wrap.getBoundingClientRect().width; if (Math.abs(w - lastW) > 80) { lastW = w; fit(); } });
    const ptrs = new Map(); let drag = null, pinch = null;
    svg.addEventListener('pointerdown', e => {
      if (e.button !== undefined && e.button !== 0) return;
      try { svg.setPointerCapture(e.pointerId); } catch (x) {}
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), w: vb.w, h: vb.h, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, vx: vb.x, vy: vb.y }; drag = null; return; }
      const g = e.target.closest('.mesa'); const id = g ? g.dataset.id : null;
      const pos = id && h.posicion ? h.posicion(id) : null;
      drag = { id, sx: e.clientX, sy: e.clientY, vx: vb.x, vy: vb.y, moved: false, mx: pos ? pos.x : 0, my: pos ? pos.y : 0, arrastra: !!(id && h.puedeArrastrar && h.puedeArrastrar(id)) };
    });
    svg.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const f = Math.max(0.3, Math.min(3, pinch.d / Math.max(1, d))); const r = svg.getBoundingClientRect(); const sc = pinch.w / r.width; const cx = pinch.vx + (pinch.cx - r.left) * sc, cy = pinch.vy + (pinch.cy - r.top) * sc; const nw = Math.max(300, Math.min(4000, pinch.w * f)); const nh = nw * pinch.h / pinch.w; const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; vb.w = nw; vb.h = nh; vb.x = cx - (mx - r.left) * (nw / r.width); vb.y = cy - (my - r.top) * (nh / r.height); applyVB(); return; }
      if (!drag) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true; const r = svg.getBoundingClientRect(); const sc = vb.w / r.width;
      if (drag.arrastra) {
        const x = Math.round(Math.max(20, Math.min(1980, drag.mx + dx * sc))), y = Math.round(Math.max(20, Math.min(780, drag.my + dy * sc)));
        const g = svg.querySelector(`.mesa[data-id="${CSS.escape(drag.id)}"]`); if (g) g.setAttribute('transform', `translate(${x} ${y})`);
        if (h.onMover) h.onMover(drag.id, x, y);
      } else { vb.x = drag.vx - dx * sc; vb.y = drag.vy - dy * sc; applyVB(); wrap.classList.add('dragging'); }
    });
    function fin(e) {
      if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); try { svg.releasePointerCapture(e.pointerId); } catch (x) {}
      wrap.classList.remove('dragging');
      if (pinch) { if (ptrs.size < 2) pinch = null; drag = null; return; }
      if (!drag) return; const d = drag; drag = null;
      if (d.moved) { if (d.arrastra && h.onSoltar) h.onSoltar(d.id); return; }
      if (h.onTap) h.onTap(d.id);
    }
    svg.addEventListener('pointerup', fin); svg.addEventListener('pointercancel', fin);
    return { vb, fit, zoomAt, centrar, applyVB, zoomIn: () => zoomAt(0.8, vb.x + vb.w / 2, vb.y + vb.h / 2), zoomOut: () => zoomAt(1.25, vb.x + vb.w / 2, vb.y + vb.h / 2) };
  }
  function telWa(tel) { const d = String(tel || '').replace(/\D/g, ''); if (!d) return ''; if (d.length === 10 && d[0] === '3') return '57' + d; if (d.length === 12 && d.startsWith('57')) return d; return d; }
  function fecha(iso) { try { return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return iso; } }
  return { FORMAS, ZONAS, ESTADOS, CON_RESERVA, CAMPOS, DEFAULTS, CONFIG_DEF, mk, esc, normalizar, raiz, miembros, puestosGrupo, etiquetaGrupo, sillas, renderMesas, montar, crearVista, telWa, fecha };
})();
