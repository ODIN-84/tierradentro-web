# Sitio web · Tierradentro Café Express

Sitio estático (sin framework) con la landing y la carta 2026 del café. Se publica en Vercel desde GitHub.

| Ruta | Archivo | Qué es |
|---|---|---|
| `/` | `index.html` | Landing: qué encuentras, horario, ubicación, WhatsApp, reseñas. |
| `/carta` | `carta/index.html` | La carta con fotos y precios. Se genera desde el artefacto de Claude. |
| `/img/` | `img/*.webp` | Fotos de la carta (148 archivos, portadas `h*.webp`, miniaturas `t*.webp`). |
| `/js/config.js` | | ID de Google Analytics y datos públicos. **Único archivo que hay que editar para activar la analítica.** |
| `/js/analytics.js` | | Eventos GA4 (ver lista abajo). |
| `vercel.json` | | URLs limpias, redirección `/menu` → `/carta`, caché de imágenes. |

## Fuente de la carta: el artefacto de Claude

La carta se diseña y edita en el artefacto **https://claude.ai/artifact/DwXHwwdohhGCbhvQQ9oU9S**.
Para publicar una versión nueva:

1. Descargar el HTML del artefacto (desde Claude Code: `Artifact read` guarda `index.html` e `img/`).
2. Copiar las imágenes nuevas a `img/`.
3. Ejecutar:

```bash
python scripts/construir-carta.py <ruta-al-html-descargado>
```

4. `git commit` y `git push`. Vercel publica solo.

La copia del artefacto usada en cada build queda en `scripts/artefacto-carta-<fecha>.html` para trazabilidad.

## Publicación

- **GitHub:** https://github.com/ODIN-84/tierradentro-web (usuario ODIN-84, creado el 2026-10-21 con la cuenta de Google de Carlos).
- **Vercel:** proyecto `tierradentro-web` del equipo `odin-84`, importado desde GitHub el 2026-10-21 (preset Other, sin build). Cada push a `main` publica. **URL actual: https://tierradentro-web.vercel.app** (cambiará al dominio propio cuando se conecte).
- **Dominio:** `tierradentroexpress.com` (disponible al 2026-10-21; se compra y se conecta en Vercel → Settings → Domains).

## Google Analytics 4

1. Propiedad creada el 2026-10-21 con la cuenta `tierradentrocafeexpress@gmail.com`: cuenta "Tierradentro Café Express", propiedad "Sitio web tierradentroexpress.com", flujo web ID 16177958744, ID de medición `G-984SW3TT1L`.
2. Flujo de datos web → copiar el **ID de medición** (`G-XXXXXXXXXX`).
3. Pegarlo en `js/config.js` (`GA_ID`). Mientras diga `PENDIENTE`, nada se envía a Google y los eventos salen en la consola del navegador.
4. Registrar como **dimensiones personalizadas** (Administrar → Definiciones personalizadas → alcance evento):
   `page_type`, `category`, `cta`, `section`, `qr_location`, `percent`, `direction`, `seconds`, `item_category`.

### Eventos que envía el sitio

| Evento | Parámetros | Cuándo |
|---|---|---|
| `page_view` (automático) | page_type | Cada carga. |
| `qr_scan` | qr_location, campaign | Llegó por un QR (`?utm_source=qr&utm_medium=qr&utm_content=mesa3`). |
| `select_category` | category | Tocó la barra de categorías de la carta. |
| `view_category` | category | Una categoría de la carta se vio en pantalla (una vez por visita). |
| `view_item` | item_name, item_category, price, items[] | Abrió la foto de un producto. |
| `photo_nav` | item_name, direction | Pasó de foto dentro del visor. |
| `scroll_depth` | percent | 25 / 50 / 75 / 100 % de la página. |
| `time_on_page` | seconds | 30, 60, 120 y 300 s con la pestaña visible. |
| `cta_click` | cta, link_url | ver_carta, whatsapp, como_llegar, mapa, resena, card_* (tarjetas de la landing). |
| `view_section` | section | Sección de la landing visible (una vez por visita). |

### Enlaces para códigos QR

Un QR por ubicación, para saber de dónde viene el tráfico:

| Ubicación | URL |
|---|---|
| Mesas | `https://tierradentroexpress.com/carta?utm_source=qr&utm_medium=qr&utm_campaign=carta&utm_content=mesa` |
| Vitrina / caja | `https://tierradentroexpress.com/carta?utm_source=qr&utm_medium=qr&utm_campaign=carta&utm_content=caja` |
| Fachada del mall | `https://tierradentroexpress.com/?utm_source=qr&utm_medium=qr&utm_campaign=landing&utm_content=fachada` |
| Instagram (bio) | `https://tierradentroexpress.com/?utm_source=instagram&utm_medium=social&utm_campaign=bio` |
| WhatsApp (estado / respuesta) | `https://tierradentroexpress.com/carta?utm_source=whatsapp&utm_medium=social&utm_campaign=carta` |

## Probar en el computador

```bash
python -m http.server 8080
```

y abrir http://localhost:8080 (las rutas `/img/` y `/js/` son absolutas, por eso hace falta servidor).

---
Elaboró: agente Tierradentro (Claude Code) · 2026-10-21 · Revisa: Juanca · Aprueba: Carlos.
