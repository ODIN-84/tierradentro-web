"""Servidor local de prueba para los tableros del equipo (/equipo/...).

Sirve el sitio y responde en /api/equipo con el mismo protocolo de scripts/equipo-apps-script/Code.gs,
guardando en memoria. Claves de PRUEBA (inventadas, no son las reales):
  1111 → última persona del calendario de prueba · 2222 → primera persona · 9999 → administración
Uso: python scripts/equipo-mock-server.py 8095   → abrir http://localhost:8095/equipo/turnos?mock
(con ?mock la página usa /api/equipo en vez de la URL real de config.js)
"""
import json
import re
import secrets
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PERSONAS = {"1111": ("persona_a", "equipo"), "2222": ("persona_b", "equipo"), "9999": ("admin", "admin")}
TABLEROS = {"turnos": {"todas": ["calendario", "marcas", "notas", "solicitudes", "respuestas"],
                       "soloAdmin": ["calendario", "respuestas"], "propias": ["marcas", "notas", "solicitudes"]}}
DOCS, SESIONES, ESTADO = {}, {}, {"v": 1, "fallos": 0}
FALLOS_MAX = 5

# semilla opcional fuera del repositorio (nombres y turnos reales no se publican)
SEMILLA = RAIZ.parent.parent / "09-TURNOS" / "respaldo" / "calendario-para-cargar.json"
if SEMILLA.exists():
    DOCS["turnos/calendario/actual"] = json.loads(SEMILLA.read_text(encoding="utf-8"))
    ids = [e["id"] for e in DOCS["turnos/calendario/actual"].get("empleados", [])]
    PERSONAS.update({"1111": (ids[-1], "equipo"), "2222": (ids[0], "equipo")} if len(ids) > 1 else {})


def filtrar(docs, t, emp):
    if not emp:
        return docs
    out = {}
    for r, d in docs.items():
        col, _id = r.split("/", 1)
        if col in t["propias"]:
            if d.get("emp") == emp:
                out[r] = d
        elif col == "respuestas":
            if docs.get("solicitudes/" + _id, {}).get("emp") == emp:
                out[r] = d
        elif col == "calendario":  # cada persona recibe solo sus turnos; de los demás, el nombre
            c = json.loads(json.dumps(d))
            c["dias"] = {f: {emp: v[emp]} for f, v in c.get("dias", {}).items() if emp in v}
            c["empleados"] = [{k: e.get(k) for k in ("id", "nombre", "corto", "rol")} for e in c.get("empleados", [])]
            out[r] = c
        else:
            out[r] = d
    return out


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(RAIZ), **k)

    def responder(self, obj):
        cuerpo = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def do_POST(self):
        if self.path.split("?")[0] != "/api/equipo":
            self.send_error(404)
            return
        try:
            b = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))).decode("utf-8"))
        except Exception:
            return self.responder({"ok": False, "error": "formato"})
        t = TABLEROS.get(b.get("app"))
        if not t:
            return self.responder({"ok": False, "error": "tablero"})
        acc = b.get("accion")
        if acc == "entrar":
            if ESTADO["fallos"] >= FALLOS_MAX:
                return self.responder({"ok": False, "error": "bloqueado"})
            p = PERSONAS.get(str(b.get("clave", "")).strip())
            if not p:
                ESTADO["fallos"] += 1
                return self.responder({"ok": False, "error": "clave"})
            tok = secrets.token_hex(32)
            SESIONES[tok] = p
            return self.responder({"ok": True, "sesion": tok, "rol": p[1], "emp": None if p[1] == "admin" else p[0]})
        s = SESIONES.get(b.get("sesion"))
        if not s:
            return self.responder({"ok": False, "error": "clave"})
        admin = s[1] == "admin"
        emp = None if admin else s[0]
        if acc == "salir":
            SESIONES.pop(b.get("sesion"), None)
            return self.responder({"ok": True})
        if acc == "yo":
            return self.responder({"ok": True, "rol": s[1], "emp": emp})
        if acc == "leer":
            if b.get("v") == ESTADO["v"]:
                return self.responder({"ok": True, "rol": s[1], "emp": emp, "v": ESTADO["v"], "igual": True})
            pre = b["app"] + "/"
            propios = {k[len(pre):]: v for k, v in DOCS.items() if k.startswith(pre)}
            return self.responder({"ok": True, "rol": s[1], "emp": emp, "v": ESTADO["v"], "docs": filtrar(propios, t, emp)})
        if acc not in ("set", "borrar"):
            return self.responder({"ok": False, "error": "accion"})
        m = re.fullmatch(r"([a-z]+)/([A-Za-z0-9_-]{1,60})", str(b.get("ruta", "")))
        if not m or m.group(1) not in t["todas"]:
            return self.responder({"ok": False, "error": "ruta"})
        col = m.group(1)
        if col in t["soloAdmin"] and not admin:
            return self.responder({"ok": False, "error": "permiso"})
        ruta = b["app"] + "/" + b["ruta"]
        if not admin and col in t["propias"]:
            if acc == "set" and (not isinstance(b.get("data"), dict) or b["data"].get("emp") != emp):
                return self.responder({"ok": False, "error": "permiso"})
            if ruta in DOCS and DOCS[ruta].get("emp") != emp:
                return self.responder({"ok": False, "error": "permiso"})
        if acc == "borrar":
            DOCS.pop(ruta, None)
        else:
            if not isinstance(b.get("data"), dict):
                return self.responder({"ok": False, "error": "formato"})
            DOCS[ruta] = b["data"]
        ESTADO["v"] += 1
        self.responder({"ok": True, "v": ESTADO["v"]})

    def log_message(self, fmt, *args):
        if "POST" in str(args[0] if args else ""):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8095
    print(f"Tableros del equipo (prueba) en http://localhost:{puerto}/equipo/turnos?mock")
    ThreadingHTTPServer(("127.0.0.1", puerto), H).serve_forever()
