# Reservas de mesas en la web · puesta en marcha

Las páginas **tierradentroexpress.com/reservas** (clientes) y **tierradentroexpress.com/reservas/admin** (café) guardan las
reservas en una hoja de cálculo de Google de la cuenta del café, a través de un Google Apps Script. Es gratis, no hay que
instalar nada y Juanca puede ver las reservas también en la hoja.

## Cómo funciona

1. El cliente abre `/reservas`, toca una mesa en blanco, escribe su nombre, cuántos vienen y su WhatsApp, y toca **Solicitar**.
   La mesa queda **por confirmar** y la página le muestra un código (por ejemplo `TD-7KQ2`) y el botón **Confirmar por WhatsApp**,
   que abre el WhatsApp del café (314 655 1487) con el mensaje listo.
2. El café abre `/reservas/admin` (con la clave), ve la mesa en amarillo "Por confirmar" con el nombre, las personas y el celular,
   la marca **Confirmada** y le responde con el botón **Responder por WhatsApp** (mensaje de confirmación listo).
3. Si el café no confirma una solicitud en 48 horas (se cambia en "editar" → Horas para confirmar), la mesa vuelve a quedar libre sola.
4. Las reservas que llegan por teléfono o en persona se anotan en `/reservas/admin` igual que antes. El tablero también permite mover
   mesas, unir mesas para grupos grandes, cambiar números y puestos, y descargar la lista en CSV.
5. Desde "editar" el café puede **cerrar las reservas web** (la página de clientes muestra solo el botón de WhatsApp) y cambiar la
   fecha y la hora de la fiesta para el mes siguiente. Para empezar una fiesta nueva: Editar plano → **Volver al plano del Anexo 1**
   (borra todas las reservas) o liberar mesa por mesa.

## Estado (2026-10-27): ya está en marcha

- Hoja: "Reservas fiesta de salsa" en el Drive de tierradentrocafeexpress@gmail.com (su ID está en `SHEET_ID` dentro de `Code.gs`).
- Proyecto de Apps Script **"Reservas fiesta de salsa"** creado como proyecto independiente desde script.google.com (el menú
  Extensiones → Apps Script de la hoja fallaba con esa cuenta), con `setup` ejecutado y autorizado.
- Implementación "reservas", versión 1, app web ejecutada como el café con acceso para cualquiera. La URL está en `js/config.js`.
- La clave del tablero está en la fila `clave_admin` de la pestaña `config` de la hoja.

Para cambios futuros en `Code.gs`: abrir script.google.com con la cuenta del café → proyecto "Reservas fiesta de salsa" → pegar el
código → guardar → **Implementar → Administrar implementaciones → lápiz → Versión: Nueva versión → Implementar**. La URL no cambia.

## Puesta en marcha desde cero (si hubiera que repetirla, unos 5 minutos, con la cuenta tierradentrocafeexpress@gmail.com)

Si el paso 2 falla con "No se pudo abrir el archivo en este momento", hacerlo como proyecto independiente: script.google.com →
**Nuevo proyecto** → renombrar → pegar `Code.gs` (ya trae `SHEET_ID` de la hoja) y seguir desde el paso 4.

1. En Google Drive, crear una **hoja de cálculo nueva** y llamarla `Reservas fiesta de salsa`.
2. Menú **Extensiones → Apps Script**. Se abre un editor con un archivo `Código.gs` vacío.
3. Borrar lo que tenga y **pegar todo el contenido de `Code.gs`** (este mismo directorio). Guardar (icono de disquete).
4. Arriba, donde dice "Seleccionar función", elegir **`setup`** y pulsar **Ejecutar ▶**. Google pide autorización la primera vez:
   "Revisar permisos" → elegir la cuenta del café → "Avanzado" → "Ir a ... (no seguro)" → "Permitir". Es el script propio, no uno ajeno.
   Al terminar, la hoja tiene tres pestañas: `mesas` (las 39 mesas), `config` y `solicitudes`. En `config` está la fila
   **`clave_admin`**: esa es la clave del tablero del café.
5. **Implementar → Nueva implementación** → icono de engranaje → **Aplicación web**. Descripción: `reservas`.
   Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier persona**. → **Implementar**. Copiar la **URL de la aplicación web**
   (termina en `/exec`).
6. En el repositorio del sitio, abrir `js/config.js` y pegar esa URL en `RESERVAS_API` (reemplazando `"PENDIENTE"`).
   Hacer `git commit` y `git push`; Vercel publica solo.
7. Probar: abrir https://tierradentroexpress.com/reservas, pedir una mesa con un número propio, y en
   https://tierradentroexpress.com/reservas/admin entrar con la clave, confirmarla y liberarla.
8. Cuando funcione, cambiar en `index.html` el botón **Aparta tu mesa** de la franja "De noche, salsa" para que apunte a `/reservas`
   en vez de a WhatsApp.

Si más adelante se cambia el código de `Code.gs`, hay que volver a pegarlo en el editor y hacer **Implementar → Administrar
implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar**. La URL no cambia.

## Seguridad y límites

- La página de clientes solo recibe el plano sin nombres ni celulares (`libre` / `reservada`). Los datos personales solo los ve
  quien tenga la clave de administración.
- La clave queda guardada en el celular o computador donde se entre al tablero. **Para cambiarla:** escribir la nueva en la celda
  B10 (fila `clave_admin`) de la pestaña `config` de la hoja y, en el editor de Apps Script, ejecutar `setup` otra vez. Una clave
  corta (cuatro dígitos) se adivina probando; mejor una palabra con número.
- Un Apps Script gratuito atiende de sobra el tráfico de una fiesta (límite de Google: decenas de miles de llamadas por día).
- Para probar en el computador sin tocar la hoja real: `python scripts/reservas-mock-server.py` y abrir http://localhost:8092/reservas
  (clave del tablero de prueba: `PRUEBA`).

## Archivos

| Archivo | Qué es |
|---|---|
| `reservas/index.html` | Página de clientes. |
| `reservas/admin/index.html` | Tablero del café (clave). |
| `js/plano-salsa.js` | Plano del piso PB, las 39 mesas y el dibujo de las sillas; lo usan las dos páginas. |
| `js/config.js` → `RESERVAS_API` | URL del Apps Script. |
| `scripts/reservas-apps-script/Code.gs` | El Apps Script (respaldo). |
| `scripts/reservas-apps-script/semilla.json` | Las 39 mesas del plan de contingencia, generadas desde `plano-salsa.js`. |
| `scripts/construir-plano-salsa.py` | Regenera el fondo del plano y la semilla a partir del tablero del agente. |
| `scripts/reservas-mock-server.py` | Servidor local de prueba que imita el Apps Script. |
