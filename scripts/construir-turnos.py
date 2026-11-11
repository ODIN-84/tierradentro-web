"""Genera /equipo/turnos/index.html a partir del tablero de turnos con marca
(3-SALIDAS/09-TURNOS/turnos-tierradentro.html, que sale del artefacto de Claude "Turnos Tierradentro Café").

El repositorio es público: aquí NO entran nombres ni turnos. Los datos viven en la hoja del café
(scripts/equipo-apps-script/Code.gs) y la página los pide con clave por js/equipo-db.js.

Uso: python scripts/construir-turnos.py [ruta-al-tablero.html]
También deja el calendario que venía incrustado en 09-TURNOS/respaldo/calendario-para-cargar.json (fuera del repositorio),
para cargarlo una vez con Herramientas → Cargar respaldo.
"""
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FUENTE = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO.parent.parent / "09-TURNOS" / "turnos-tierradentro.html"
page = FUENTE.read_text(encoding="utf-8")


def sub1(text, old, new):
    assert text.count(old) == 1, f"{text.count(old)} coincidencias: {old[:60]}"
    return text.replace(old, new)


# 1. sacar los datos incrustados (nombres y turnos) y dejar solo lo que no es personal
m = re.search(r'<script id="datos" type="application/json">(.*?)</script>', page, flags=re.S)
datos = json.loads(m.group(1))
respaldo = FUENTE.parent / "respaldo" / "calendario-para-cargar.json"
if datos.get("empleados"):
    respaldo.parent.mkdir(parents=True, exist_ok=True)
    respaldo.write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")
publico = {"version": datos.get("version", 2), "negocio": "Tierradentro Café Express", "guardado": None,
           "maxSemana": datos.get("maxSemana", 42), "semanaInicial": None, "seq": 0, "empleados": [],
           "festivos": datos.get("festivos", {}), "dias": {}}
page = page[:m.start(1)] + json.dumps(publico, ensure_ascii=False, separators=(",", ":")) + page[m.end(1):]
for e in datos.get("empleados", []):
    assert e["nombre"] not in page, "quedó un nombre en la página"

# 2. título, respaldo propio del sitio y salida del dispositivo
page = re.sub(r"<title>.*?</title>", "<title>Turnos · Tierradentro Café Express</title>", page, count=1)
page = sub1(page, '<script id="app">', '<script src="/js/config.js"></script>\n<script src="/js/equipo-db.js"></script>\n<script id="app">')
page = sub1(page, "Franquiciado de Tierradentro Café &amp; Co. S.A.S.</p></footer>",
            "Franquiciado de Tierradentro Café &amp; Co. S.A.S.</p>"
            "<button class=\"linkbtn\" data-act=\"salir\">Salir de este dispositivo</button></footer>")
# textos que hablaban del enlace del artefacto
page = sub1(page, "Abre el calendario desde el enlace que te compartieron, con tu cuenta.", "Recarga la página y escribe tu clave.")
page = sub1(page, "Tu acceso a este calendario es solo de lectura, así que no puedes registrar. Pide al administrador que te comparta el calendario como <b>Editor</b>.",
            "El tablero no aceptó tu último registro. Recarga la página; si sigue igual, avisa al administrador.")
page = sub1(page, "Tu acceso es de solo lectura. Pide que te compartan el calendario como Editor.", "El tablero no aceptó ese registro. Avisa al administrador.")
page = sub1(page, "Solo el dueño del calendario puede guardar los turnos.", "Solo el administrador puede guardar los turnos.")
# cada persona entra con su clave: el tablero ya sabe quién es y no deja cambiar de persona (el administrador sí elige)
page = sub1(page, "OWNER=!!v[0];UID=v[1]||null;", "OWNER=!!v[0];UID=v[1]||null;if(window.TDE_EQUIPO&&window.TDE_EQUIPO.emp)YO=window.TDE_EQUIPO.emp;")
page = sub1(page, "<button class=\"linkbtn\" data-act=\"cambiaryo\">No soy '+esc(corto(e))+'</button>",
            "'+(window.TDE_EQUIPO&&window.TDE_EQUIPO.emp?'':'<button class=\"linkbtn\" data-act=\"cambiaryo\">No soy '+esc(corto(e))+'</button>')+'")
page = sub1(page, "Elige tu nombre. Este dispositivo lo recuerda para que marques tu ingreso y tu salida con un solo toque.",
            "Elige a la persona. Si entraste con tu clave y no apareces aquí, avisa al administrador para que te agregue al calendario.")

# Vista del colaborador (pedido de Carlos y Juanca, 2026-11-10): cada persona ve solo su calendario.
# El servidor ya le entrega únicamente sus turnos; aquí se quita lo general: resumen con alertas, cobertura,
# dominicales trabajados, orden y herramientas. El administrador sigue viendo todo.
page = sub1(page, "function canCal(){return OWNER}", "function canCal(){return OWNER}\nfunction soloYo(){return (!OWNER&&window.TDE_EQUIPO&&window.TDE_EQUIPO.emp)||null}")
page = sub1(page, "  h+=summary(days);\n",
            "  h+=soloYo()?'<section class=\"sum\" aria-label=\"Semana\"><div><p class=\"eyebrow\">Mi semana</p><h2>'+weekLabel()+'</h2></div></section>':summary(days);\n")
page = sub1(page, "<div class=\"corner\">Equipo<small>Horas de la semana y dominicales del mes</small></div>';",
            "<div class=\"corner\">'+(soloYo()?'Mi calendario<small>Horas programadas de la semana</small>':'Equipo<small>Horas de la semana y dominicales del mes</small>')+'</div>';")
page = sub1(page, "  orderedEmps().forEach(function(e){\n", "  orderedEmps().filter(function(e){return !soloYo()||e.id===soloYo()}).forEach(function(e){\n")
page = sub1(page, "'<span class=\"meta\">Dominicales trabajados '+MES[mm]+': <b class=\"'+(dm>=3?'bad':'')+'\">'+dm+'</b></span>'+",
            "(soloYo()?'':'<span class=\"meta\">Dominicales trabajados '+MES[mm]+': <b class=\"'+(dm>=3?'bad':'')+'\">'+dm+'</b></span>')+")
page = sub1(page, "  h+='<div class=\"ftl\">Cobertura<small>Personas por franja, 6 am a 3 am</small></div>';\n  days.forEach(function(f){h+=coverage(f)});\n",
            "  if(!soloYo()){h+='<div class=\"ftl\">Cobertura<small>Personas por franja, 6 am a 3 am</small></div>';\n  days.forEach(function(f){h+=coverage(f)});}\n")
page = sub1(page, "  h+='<label class=\"sortl\">", "  if(!soloYo())h+='<label class=\"sortl\">")
page = sub1(page, "  h+='<div class=\"menuwrap\">", "  if(!soloYo())h+='<div class=\"menuwrap\">")
page = sub1(page, "Este es el calendario publicado del equipo. Para pedir un cambio", "Este es tu calendario. Para pedir un cambio")
page = sub1(page, "'</select></label><p class=\"lead\">'+esc(cortoId(sc))+' tiene ese día: <b>'+esc(sf?progText(items(sf,sc)):'')+'</b>. Habla primero con tu compañero.</p>';",
            "'</select></label><p class=\"lead\">Habla primero con tu compañero.</p>';")

CABEZA = """<!doctype html>
<html lang="es" data-tablero="turnos">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#111113">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style>
</head>
<body>
<!-- Generado por scripts/construir-turnos.py. No editar a mano: se pierde al regenerar. -->
"""
salida = REPO / "equipo" / "turnos" / "index.html"
salida.parent.mkdir(parents=True, exist_ok=True)
salida.write_text(CABEZA + page + "</body>\n</html>\n", encoding="utf-8", newline="\n")
print(f"ok {salida.relative_to(REPO)} · {salida.stat().st_size} bytes · respaldo del calendario: {respaldo.name if respaldo.exists() else 'no había datos'}")
