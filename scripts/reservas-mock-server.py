"""Servidor local de prueba para /reservas y /reservas/admin.

Sirve el sitio estático y simula el Apps Script (scripts/reservas-apps-script/Code.gs) en memoria, con la misma
lógica y las mismas respuestas, en http://localhost:8092/api . Solo para probar en el computador; en producción el
respaldo es el Apps Script de la cuenta del café.

Uso:  python scripts/reservas-mock-server.py [puerto] [demora_segundos]     (clave de administración: PRUEBA)
      La demora (por ejemplo 2) imita lo que tarda el Apps Script real en responder, para probar la carga.
Las páginas usan este servidor cuando se abren desde localhost y RESERVAS_API es "PENDIENTE" (ver js/config.js).
"""
import json, random, string, sys, threading, time
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

RAIZ = Path(__file__).resolve().parents[1]
SEMILLA = json.loads((RAIZ / "scripts" / "reservas-apps-script" / "semilla.json").read_text(encoding="utf-8"))
CLAVE = "PRUEBA"
DEMORA = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
CONFIG = {"nombre": "Fiesta de salsa", "fecha": "Viernes 30 de octubre de 2026", "hora": "9:00 p. m. a 3:00 a. m.",
          "aforo": 250, "sentados": 204, "abierto": "si", "horas_espera": 48, "whatsapp": "573146551487"}
MESAS = [dict(m) for m in SEMILLA]
SOLICITUDES = []
LOCK = threading.Lock()
ESTADOS = ["libre", "solicitada", "reservada", "confirmada", "llego"]
CAMPOS = ["id", "num", "forma", "zona", "x", "y", "rot", "asientos", "grupo", "estado", "nombre", "personas", "tel", "nota", "act"]


def ahora():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def codigo():
    return "TD-" + "".join(random.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(4))


def limpiar(raw):
    if not raw or not raw.get("id"):
        return None
    m = {}
    m["id"] = str(raw["id"])[:40]
    m["num"] = str(raw.get("num", ""))[:10]
    m["forma"] = raw.get("forma") if raw.get("forma") in ("redonda", "cuadrada", "barra") else "redonda"
    m["zona"] = raw.get("zona") if raw.get("zona") in "ABCDE" else "E"
    for k in ("x", "y", "rot"):
        try: m[k] = int(round(float(raw.get(k) or 0)))
        except (TypeError, ValueError): m[k] = 0
    try: m["asientos"] = max(1, min(16, int(round(float(raw.get("asientos") or 4)))))
    except (TypeError, ValueError): m["asientos"] = 4
    m["grupo"] = str(raw.get("grupo") or "")[:40]
    m["estado"] = raw.get("estado") if raw.get("estado") in ESTADOS else "libre"
    m["nombre"] = str(raw.get("nombre") or "")[:80]
    try: m["personas"] = max(0, int(round(float(raw.get("personas") or 0))))
    except (TypeError, ValueError): m["personas"] = 0
    m["tel"] = str(raw.get("tel") or "")[:20]
    m["nota"] = str(raw.get("nota") or "")[:300]
    m["act"] = str(raw.get("act") or ahora())
    return m


def publica(cfg):
    return {k: cfg[k] for k in ("nombre", "fecha", "hora", "aforo", "sentados", "abierto", "whatsapp", "horas_espera")}


def guardar(lista):
    n = 0
    for raw in lista or []:
        m = limpiar(raw)
        if not m:
            continue
        for i, x in enumerate(MESAS):
            if x["id"] == m["id"]:
                MESAS[i] = m
                break
        else:
            MESAS.append(m)
        n += 1
    return {"ok": True, "guardadas": n, "mesas": MESAS}


def solicitar(b):
    nombre = str(b.get("nombre") or "").strip()[:60]
    try: personas = int(round(float(b.get("personas") or 0)))
    except (TypeError, ValueError): personas = 0
    tel = "".join(c for c in str(b.get("tel") or "") if c.isdigit())[:15]
    if CONFIG["abierto"] != "si":
        return {"ok": False, "error": "cerrado"}
    if len(nombre) < 2 or personas < 1 or len(tel) < 10:
        return {"ok": False, "error": "datos"}
    m = next((x for x in MESAS if x["id"] == str(b.get("mesa") or "")), None)
    if not m:
        return {"ok": False, "error": "no_existe"}
    if m["estado"] != "libre" or m["grupo"]:
        return {"ok": False, "error": "ocupada", "mesa": m["num"]}
    if personas > m["asientos"]:
        return {"ok": False, "error": "capacidad", "asientos": m["asientos"]}
    cod = codigo()
    m.update(estado="solicitada", nombre=nombre, personas=personas, tel=tel, nota="Solicitud web " + cod, act=ahora())
    SOLICITUDES.append({"fecha": ahora(), "codigo": cod, "mesa": m["num"], "nombre": nombre, "personas": personas, "tel": tel})
    return {"ok": True, "codigo": cod, "mesa": {"id": m["id"], "num": m["num"], "asientos": m["asientos"], "zona": m["zona"]}, "config": publica(CONFIG)}


def api(b):
    acc = b.get("accion")
    if acc == "solicitar":
        return solicitar(b)
    if str(b.get("clave") or "").strip() != CLAVE:
        return {"ok": False, "error": "clave"}
    if acc == "estado":
        return {"ok": True, "publico": False, "config": dict(CONFIG), "mesas": MESAS, "hora": ahora()}
    if acc == "guardar":
        return guardar([b.get("mesa")])
    if acc == "guardar_varias":
        return guardar(b.get("mesas") or [])
    if acc == "borrar":
        i = str(b.get("id") or "")
        MESAS[:] = [x for x in MESAS if x["id"] != i]
        for x in MESAS:
            if x["grupo"] == i:
                x["grupo"] = ""
        return {"ok": True, "mesas": MESAS}
    if acc == "config":
        c = b.get("config") or {}
        for k in ("nombre", "fecha", "hora", "whatsapp"):
            if k in c: CONFIG[k] = str(c[k])[:120]
        for k in ("aforo", "sentados", "horas_espera"):
            if k in c:
                try: CONFIG[k] = max(0, int(round(float(c[k] or 0))))
                except (TypeError, ValueError): pass
        if "abierto" in c: CONFIG["abierto"] = "si" if str(c["abierto"]).lower() == "si" else "no"
        return {"ok": True, "config": dict(CONFIG)}
    if acc == "reset":
        MESAS[:] = [dict(m) for m in SEMILLA]
        return {"ok": True, "mesas": MESAS}
    return {"ok": False, "error": "accion"}


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(RAIZ), **k)

    def _json(self, o):
        data = json.dumps(o, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/api":
            q = parse_qs(u.query)
            if q.get("accion", [""])[0] == "estado":
                if DEMORA:
                    time.sleep(DEMORA)
                with LOCK:
                    pub = [{"id": m["id"], "num": m["num"], "forma": m["forma"], "zona": m["zona"], "x": m["x"], "y": m["y"], "rot": m["rot"],
                            "asientos": m["asientos"], "grupo": m["grupo"], "estado": "libre" if m["estado"] == "libre" else "reservada"} for m in MESAS]
                    return self._json({"ok": True, "publico": True, "config": publica(CONFIG), "mesas": pub, "hora": ahora()})
            return self._json({"ok": True, "servicio": "mock"})
        # URLs limpias como en Vercel: /reservas → /reservas/index.html
        p = RAIZ / u.path.lstrip("/")
        if u.path != "/" and p.is_dir() and not self.path.endswith("/"):
            self.path = u.path + "/" + ("?" + u.query if u.query else "")
        return super().do_GET()

    def do_POST(self):
        u = urlparse(self.path)
        if u.path != "/api":
            self.send_error(404); return
        n = int(self.headers.get("Content-Length") or 0)
        try:
            b = json.loads(self.rfile.read(n).decode("utf-8") or "{}")
        except ValueError:
            return self._json({"ok": False, "error": "json"})
        with LOCK:
            return self._json(api(b))

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8092
    print(f"Mock de reservas en http://localhost:{puerto}/reservas  (admin: /reservas/admin, clave {CLAVE})")
    ThreadingHTTPServer(("127.0.0.1", puerto), H).serve_forever()
