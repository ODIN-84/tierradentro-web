// Configuración pública del sitio. Se puede editar sin tocar el resto del código.
// GA_ID: ID de medición de Google Analytics 4 (empieza por "G-").
// Mientras sea "PENDIENTE", analytics.js no carga Google Analytics y solo escribe los eventos en la consola.
window.TDE_CONFIG = {
  GA_ID: "G-984SW3TT1L",
  WHATSAPP: "573146551487",
  SITE: "https://tierradentroexpress.com",

  // Reservas de mesas de la fiesta de salsa (/reservas y /reservas/admin).
  // URL del Apps Script publicado como aplicación web (termina en /exec); ver scripts/reservas-apps-script/LEEME.md.
  // Mientras sea "PENDIENTE", /reservas solo muestra el botón de WhatsApp y /reservas/admin trabaja en modo local (sin respaldo).
  RESERVAS_API: "https://script.google.com/macros/s/AKfycbz110X_NFPh973j7N5Q-yHfUm6-At2tw6QGxF71bvOr46bWFktTOF8rhs7ot1L3o3QG/exec",

  // Línea bajo "Dónde estamos" para encontrar el local dentro del mall. Vacía = no se muestra.
  COMO_LLEGAR_MALL: "Estamos en el piso PB del edificio.",

  // Fiesta de salsa del último viernes de cada mes (franja "De noche" de la landing).
  // inicio y fin en 24 h (fin cae en la madrugada del sábado). fechas: "AAAA-MM" → "AAAA-MM-DD" cuando no es el último viernes.
  // especiales: por fecha AAAA-MM-DD, nombre y detalle de esa fiesta (vacío = no se muestra).
  NOCHES: {
    inicio: "21:00",
    fin: "02:00",
    fechas: {
      "2026-12": "2026-12-18"
    },
    especiales: {
      "2026-10-30": { nombre: "", detalle: "Disfraz opcional · DJ y percusión en vivo · Premio al mejor disfraz" }
    }
  }
};
