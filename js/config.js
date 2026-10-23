// Configuración pública del sitio. Se puede editar sin tocar el resto del código.
// GA_ID: ID de medición de Google Analytics 4 (empieza por "G-").
// Mientras sea "PENDIENTE", analytics.js no carga Google Analytics y solo escribe los eventos en la consola.
window.TDE_CONFIG = {
  GA_ID: "G-984SW3TT1L",
  WHATSAPP: "573146551487",
  SITE: "https://tierradentroexpress.com",

  // Línea bajo "Dónde estamos" para encontrar el local dentro del mall (piso y referencia).
  // Vacía = no se muestra. PENDIENTE: que Juanca la escriba, por ejemplo "Primer piso, junto a ...".
  COMO_LLEGAR_MALL: "",

  // Fiesta de salsa del último viernes de cada mes (franja "De noche" de la landing).
  // hora: la de siempre. especiales: por fecha AAAA-MM-DD, nombre y detalle de esa fiesta (vacío = no se muestra).
  NOCHES: {
    hora: "9:00 p. m.",
    especiales: {
      "2026-10-30": { nombre: "", detalle: "Disfraz opcional · DJ y percusión en vivo · Premio al mejor disfraz" }
    }
  }
};
