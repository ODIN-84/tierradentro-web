"""Inyecta el fondo del plano (SVG) en js/plano-salsa.js y genera la semilla de mesas para el Apps Script.

Fuente del fondo: el tablero del agente
  ../../08-EVENTOS/2026-10-30-fiesta-salsa/tablero-reservas-mesas.html  (bloque <defs> ... </g> de #fondo)
Salidas:
  js/plano-salsa.js                                   (reemplaza el bloque FONDO)
  scripts/reservas-apps-script/semilla.json           (las 39 mesas de DEFAULTS)
  scripts/reservas-apps-script/Code.gs                (reemplaza el bloque SEMILLA)

Uso:  python scripts/construir-plano-salsa.py
"""
import json, re, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
TABLERO = RAIZ.parents[1] / "08-EVENTOS" / "2026-10-30-fiesta-salsa" / "tablero-reservas-mesas.html"
JS = RAIZ / "js" / "plano-salsa.js"
GS = RAIZ / "scripts" / "reservas-apps-script" / "Code.gs"
SEMILLA = RAIZ / "scripts" / "reservas-apps-script" / "semilla.json"

html = TABLERO.read_text(encoding="utf-8")
ini = html.index("<defs>")
fin = html.index('<g id="mesas"></g>')
fondo = html[ini:fin].strip()
fondo = re.sub(r"\n\s*", "\n", fondo)
# El SVG va dentro de una plantilla JS con comillas invertidas
fondo_js = fondo.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

js = JS.read_text(encoding="utf-8")
patron = re.compile(r"const FONDO = `.*?`;", re.S)
if not patron.search(js):
    sys.exit("No encontré el bloque FONDO en js/plano-salsa.js")
js = patron.sub(lambda m: "const FONDO = `" + fondo_js + "`;", js)
JS.write_text(js, encoding="utf-8")

F = {"redonda": 4, "cuadrada": 6, "barra": 8}
mesas = []
for id_, num, forma, zona, x, y in re.findall(r"mk\('(m\d+)', (\d+), '(\w+)', '(\w)', (\d+), (\d+)\)", js):
    mesas.append({"id": id_, "num": num, "forma": forma, "zona": zona, "x": int(x), "y": int(y), "rot": 0, "asientos": F[forma],
                  "grupo": "", "estado": "libre", "nombre": "", "personas": 0, "tel": "", "nota": "", "act": ""})
SEMILLA.write_text(json.dumps(mesas, ensure_ascii=False, indent=0), encoding="utf-8")

if GS.exists():
    gs = GS.read_text(encoding="utf-8")
    pat = re.compile(r"const SEMILLA = \[.*?\];", re.S)
    if not pat.search(gs):
        sys.exit("No encontré el bloque SEMILLA en Code.gs")
    gs = pat.sub(lambda m: "const SEMILLA = " + json.dumps(mesas, ensure_ascii=False) + ";", gs)
    GS.write_text(gs, encoding="utf-8")

puestos = sum(m["asientos"] for m in mesas)
print(f"Fondo: {len(fondo)} caracteres. Mesas: {len(mesas)}, puestos: {puestos}.")
