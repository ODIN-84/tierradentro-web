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
  6. Agrega el selector de idioma (English → /en/menu) y los enlaces hreflang.
  7. Agrega las notas de cata y el origen de los cafés para llevar (NOTAS_CATA) y la línea del café de la casa (CAFE_CASA).
     La descripción de Gondwana del artefacto sale del producto y queda como nota al final de los cafés para llevar (NOTA_LLEVAR).

Después de correrlo, regenerar la versión en inglés: python scripts/construir-carta-en.py

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
<link rel="alternate" hreflang="es" href="https://tierradentroexpress.com/carta">
<link rel="alternate" hreflang="en" href="https://tierradentroexpress.com/en/menu">
<meta property="og:type" content="website">
<meta property="og:title" content="Carta · Tierradentro Café Express">
<meta property="og:description" content="Café de especialidad en el Mall Primavera Life, Armenia. Mira la carta completa con fotos y precios.">
<meta property="og:image" content="https://tierradentroexpress.com/img/hmaquina.webp">
<meta property="og:locale" content="es_CO">
<script src="/js/config.js"></script>
<script src="/js/analytics.js" defer></script>
"""

FOOT_HOME = '<a class="btn" href="/">Ir al inicio</a>'

# Desde el 2026-11-26 el artefacto trae la capa del sistema de diseño (<style id="td-sistema">, roles de marca.json en tema Carbón).
# Lo que el sitio agrega (selector de idioma, notas de cata) va en un bloque aparte, después de esa capa, y usa sus roles:
# contorno en píldora para el selector, arena solo en precios, etiquetas en la familia de etiquetas.
# Selector de idioma (la versión en inglés la arma scripts/construir-carta-en.py).
CSS_IDIOMA = (
    ".top{position:relative;padding-top:64px}"
    ".lang{position:absolute;top:12px;right:0;display:inline-flex;align-items:center;box-sizing:border-box;min-height:40px;padding:0 20px;"
    "border:1px solid var(--border-strong);border-radius:var(--radius-pill);background:transparent;color:var(--text-primary);"
    "font-family:var(--font-interfaz);font-weight:600;font-size:16px;line-height:1.2;letter-spacing:.04em;text-decoration:none}"
    ".lang:hover{background:var(--surface-raised)}"
    "@media (prefers-reduced-motion:no-preference){.lang{transition:background-color 160ms,border-color 160ms}}\n"
)
LINK_IDIOMA = '<a class="lang" href="/en/menu" hreflang="en" lang="en" data-track="idioma_en">English</a>'


# Notas de cata y origen tal como están impresos en las bolsas Daily Drip (foto "Cafe para llevar mesa negra.jpg" del banco
# de Juan Laverde). Los tres son la línea fija Daily Drip; el espresso de la casa es Pangea (confirmado por Carlos el 2026-10-22).
NOTAS_CATA = {
    "Café Pangea 500 g": ("mandarina | chocolate | melaza | nuez", "Huila · tueste medio"),
    "Café Laurasia 250 g": ("floral | afrutado | jugoso", "Inzá, Cauca · Alejandro Ariza"),
    "Café Gondwana 250 g": ("frutos rojos | alicorado | chocolate", "Inzá, Cauca · Alejandro Ariza"),
}
# La descripción del artefacto para Gondwana habla de los cafés de temporada, no de Gondwana: va como nota de la sección.
DESC_GONDWANA = '<p class="desc">Pregunta por nuestros high end y exóticos de temporada.</p>'
NOTA_LLEVAR = '<p class="note">Pregunta por nuestros high end y exóticos de temporada.</p>'
# Línea bajo el título de la sección Café. Vacía = no se agrega.
CAFE_CASA = '<p class="casa">Café de la casa: <b>Pangea</b> · Huila · mandarina | chocolate | melaza | nuez</p>'
CSS_CATA = (
    ".cata{grid-column:1/-1;margin:8px 0 0;font-weight:600;font-size:15px;letter-spacing:.04em;color:var(--text-primary)}"
    ".origen{grid-column:1/-1;margin:4px 0 0;font-family:var(--font-etiquetas);font-style:italic;font-weight:800;font-size:13px;line-height:1.2;"
    "letter-spacing:.08em;text-transform:uppercase;color:var(--text-secondary)}"
    ".casa{margin:8px 0 0;font-size:15px;color:var(--text-secondary)}.casa b{color:var(--text-primary);font-weight:600}\n"
)
# Precios con espacio después del símbolo ("$ 7.500"), como en la portada. Solo toca el texto de los precios de la lista;
# la hoja del producto copia el precio de la fila, así que sale igual. data-price (analítica) no cambia.
PRECIO = re.compile(r'(<div class="price">)(.*?)(</div>)', re.S)


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
    # 5. Selector de idioma en la portada. El estilo del sitio va después de la capa del sistema de diseño, para usar sus roles.
    if 'id="td-sistema"' not in head_carta:
        sys.exit('El HTML del artefacto no trae la capa del sistema de diseño (<style id="td-sistema">). '
                 "Bajar la versión publicada del artefacto, o pasarla antes por 0-AGENTE/06-BRANDING/sistema-diseno-capa/aplicar_capa.py.")
    corte = head_carta.rindex("</style>") + len("</style>")
    head_carta = head_carta[:corte] + '\n<style id="td-sitio">\n' + CSS_IDIOMA + CSS_CATA + "</style>" + head_carta[corte:]
    body_carta = body_carta.replace('<header class="top">', '<header class="top">\n    ' + LINK_IDIOMA, 1)
    body_carta = PRECIO.sub(lambda m: m.group(1) + re.sub(r"\$(?=\d)", "$ ", m.group(2)) + m.group(3), body_carta)

    # 7. Notas de cata y café de la casa.
    for nombre, (notas, procedencia) in NOTAS_CATA.items():
        patron = re.compile(r'(<h4>' + re.escape(nombre) + r'</h4><p class="desc">[^<]*</p>)')
        if not patron.search(body_carta):
            sys.exit(f"No encontré el producto {nombre!r} en la carta (NOTAS_CATA).")
        body_carta = patron.sub(lambda m: m.group(1) + f'<p class="cata">{notas}</p><p class="origen">{procedencia}</p>', body_carta, count=1)
    i_g = body_carta.find("<h4>Café Gondwana 250 g</h4>" + DESC_GONDWANA)
    if i_g == -1:
        sys.exit("No encontré la descripción de Gondwana (DESC_GONDWANA); revisar el paso 7.")
    body_carta = body_carta.replace("<h4>Café Gondwana 250 g</h4>" + DESC_GONDWANA, "<h4>Café Gondwana 250 g</h4>", 1)
    i_fin = body_carta.index("</ul>", i_g)  # fin de la lista de cafés para llevar
    body_carta = body_carta[:i_fin + 5] + NOTA_LLEVAR + body_carta[i_fin + 5:]
    if CAFE_CASA:
        body_carta = body_carta.replace("<h2>Café</h2></header>", "<h2>Café</h2>" + CAFE_CASA + "</header>", 1)

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
