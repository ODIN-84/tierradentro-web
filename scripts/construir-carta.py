"""Convierte el HTML exportado del artefacto de Claude (la carta) en carta/index.html.

Uso:
    python scripts/construir-carta.py <ruta-al-html-del-artefacto>

Qué hace:
  1. Quita la envoltura que agrega claude.ai (primer <head> con estilos genéricos).
  2. Arma un documento HTML completo con <head> propio: título, descripción, favicon,
     Open Graph, fuentes y el <style> original de la carta.
  3. Cambia las rutas de imágenes de `img/` a `/img/` (carpeta compartida con la landing).
  4. Convierte el número de WhatsApp del pie en enlace rastreable.
  5. Agrega enlace a la landing y los scripts de analítica (js/config.js + js/analytics.js).

El artefacto sigue siendo la fuente de verdad del contenido de la carta:
https://claude.ai/artifact/DwXHwwdohhGCbhvQQ9oU9S
"""
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "carta" / "index.html"

HEAD_EXTRA = """<meta name="description" content="Carta 2026 de Tierradentro Café Express: café de especialidad, filtrados, cold brew, brunch, sandwiches, postres y más. Mall Primavera Life, local 110, Armenia, Quindío.">
<meta name="theme-color" content="#111113">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="canonical" href="https://tierradentroexpress.com/carta">
<meta property="og:type" content="website">
<meta property="og:title" content="Carta · Tierradentro Café Express">
<meta property="og:description" content="Café de especialidad en el Mall Primavera Life, Armenia. Mira la carta completa con fotos y precios.">
<meta property="og:image" content="https://tierradentroexpress.com/img/hmaquina.webp">
<meta property="og:locale" content="es_CO">
<script src="/js/config.js"></script>
<script src="/js/analytics.js" defer></script>
"""

FOOT_HOME = '<a class="btn" href="/">Ir al inicio</a>'


def construir(origen: Path) -> str:
    html = origen.read_text(encoding="utf-8")

    # 1. Quitar envoltura de claude.ai: todo lo anterior al <title> de la carta.
    i_title = html.index("<title>")
    i_body = html.index('<div class="wrap">')
    head_carta = html[i_title:i_body]          # <title>, <link> de fuentes y <style>
    i_end = html.rindex("</body>")
    body_carta = html[i_body:i_end]

    # 2. Rutas de imágenes compartidas.
    head_carta = head_carta.replace('src="img/', 'src="/img/')
    body_carta = body_carta.replace('src="img/', 'src="/img/').replace('data-full="img/', 'data-full="/img/')
    body_carta = re.sub(r'\|img/', '|/img/', body_carta)

    # 3. WhatsApp del pie como enlace rastreable.
    body_carta = body_carta.replace(
        "<p>WhatsApp <b>314 655 1487</b></p>",
        '<p>WhatsApp <a href="https://wa.me/573146551487" target="_blank" rel="noopener" data-track="whatsapp"><b>314 655 1487</b></a></p>',
    )
    # 4. Botón de reseñas con marca de rastreo y enlace al inicio.
    body_carta = body_carta.replace(
        '<a class="btn" href="https://g.page/r/CdyocexGE3mlEBM/review"',
        '<a class="btn" data-track="resena" href="https://g.page/r/CdyocexGE3mlEBM/review"',
    )
    body_carta = body_carta.replace(
        "<p>Precios en pesos colombianos. Toca una foto para verla en grande.</p>",
        "<p>Precios en pesos colombianos. Toca una foto para verla en grande.</p>\n    " + FOOT_HOME,
    )
    # Enlace discreto de regreso en la portada.
    body_carta = body_carta.replace(
        '<img src="/img/logo.webp" alt="Tierradentro Café Express" width="84" height="84">',
        '<a href="/" aria-label="Ir al inicio"><img src="/img/logo.webp" alt="Tierradentro Café Express" width="84" height="84"></a>',
    )

    return (
        '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        + head_carta.replace("<title>Carta Tierradentro Café Express</title>", "<title>Carta · Tierradentro Café Express</title>", 1)
        + HEAD_EXTRA
        + "</head>\n<body data-page="
        + '"carta"'
        + ">\n"
        + body_carta
        + "\n</body>\n</html>\n"
    )


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    origen = Path(sys.argv[1])
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(construir(origen), encoding="utf-8")
    print(f"OK -> {SALIDA} ({SALIDA.stat().st_size} bytes)")
