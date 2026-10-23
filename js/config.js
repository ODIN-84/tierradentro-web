// Configuración pública del sitio. Se puede editar sin tocar el resto del código.
// GA_ID: ID de medición de Google Analytics 4 (empieza por "G-").
// Mientras sea "PENDIENTE", analytics.js no carga Google Analytics y solo escribe los eventos en la consola.
window.TDE_CONFIG = {
  GA_ID: "G-984SW3TT1L",
  WHATSAPP: "573146551487",
  SITE: "https://tierradentroexpress.com",

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
