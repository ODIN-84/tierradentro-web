# Tablero de turnos en la web: puesta en marcha del respaldo

`/equipo/turnos` es el tablero de turnos del café (calendario, marcación de entrada y salida, solicitudes y notas).
La página es pública pero no trae datos: los pide a un Apps Script de la cuenta del café, que guarda en una hoja de Google.
Cada persona entra con **su propia clave**. Es el mismo esquema de `/reservas`.

## Una sola vez (cuenta del café)

1. En Google Drive del café, crear una hoja de cálculo nueva llamada **Equipo Tierradentro**. Copiar su ID
   (lo que va entre `/d/` y `/edit` en la dirección).
2. En https://script.google.com crear un proyecto nuevo llamado **Equipo Tierradentro**, borrar lo que trae y pegar `Code.gs`.
   En la línea `const SHEET_ID = 'PENDIENTE';` poner el ID del paso 1.
3. Elegir la función `setup`, pulsar ▶ y autorizar. Crea las pestañas `docs` y `personas`.
4. Llenar la pestaña **personas**, una fila por persona, y ejecutar `setup` otra vez:

   | id | nombre | clave | rol |
   |---|---|---|---|
   | el id de la persona en el calendario | para saber de quién es la fila | la que escribe para entrar | `equipo` o `admin` |

   El agente deja la tabla lista para pegar fuera de este repositorio (carpeta privada del agente). Las claves nunca se escriben aquí.
5. **Implementar → Nueva implementación → Aplicación web.** Ejecutar como: *yo*. Quién tiene acceso: *cualquier usuario*.
   Copiar la URL que termina en `/exec`.
6. Pegar esa URL en `js/config.js` → `EQUIPO_API` y publicar el sitio (`git push`).

## Quién puede hacer qué

| Rol | Ve | Puede |
|---|---|---|
| `equipo` | El calendario y solo sus propias marcas, notas y solicitudes | Marcar entrada y salida a su nombre, enviar notas y solicitudes |
| `admin` | Todo | Además guardar el calendario, responder solicitudes y ver el registro de horas de todos |

- El `id` debe ser igual al que la persona tiene en el calendario: el nombre completo en minúsculas, sin tildes y con `_` en vez de
  espacios (las cinco primeras personas tienen id corto: su primer nombre). Si no coincide, la persona entra pero no puede marcar.
- Las claves no se pueden repetir. Una clave solo de números de menos de 4 cifras se completa con ceros a la izquierda.
- **Cada cambio en la pestaña personas pide ejecutar `setup`**, que además cierra todas las sesiones: todos vuelven a escribir su clave.
  Cuando alguien se retira, se borra su fila y se ejecuta `setup`.
- Tras 5 claves equivocadas seguidas el ingreso se bloquea 15 minutos para todos (quien ya entró sigue trabajando), y hay un tope de 40
  intentos fallidos por día. Las claves de 4 cifras son fáciles de adivinar: este freno es lo que las protege.

## Pasar el calendario que ya existe

Con la clave de administración: **Herramientas → Cargar respaldo**, pegar el respaldo del calendario y **Guardar cambios**.
El respaldo sale del artefacto de Claude (**Herramientas → Copiar respaldo**).

## Actualizar

- **El script:** pegar el `Code.gs` nuevo en el editor y, en *Administrar implementaciones*, crear una **versión nueva** de la misma
  implementación (la URL no cambia).
- **La página:** `python scripts/construir-turnos.py` la regenera desde `3-SALIDAS/09-TURNOS/turnos-tierradentro.html`
  (el tablero con el design system). El script quita los nombres y turnos incrustados antes de escribir en el repositorio.

## Probar en el computador

`python scripts/equipo-mock-server.py 8095` y abrir `http://localhost:8095/equipo/turnos?mock`.
Claves inventadas de prueba: `1111` y `2222` (equipo) y `9999` (administración). Guarda en memoria; al cerrar se pierde.

## Límites conocidos

- La página consulta cambios cada 30 segundos (no es instantáneo como el artefacto).
- Cada lectura trae todo lo que la persona puede ver: cuando la hoja crezca habrá que archivar por mes.
- La hora de cada marca es la del celular de quien marca.
