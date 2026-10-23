"""Genera la carta en inglés (en/menu/index.html) a partir de la carta en español (carta/index.html).

Uso:
    python scripts/construir-carta-en.py

Qué hace:
  1. Lee carta/index.html (la que arma construir-carta.py desde el artefacto).
  2. Traduce nombres, descripciones, categorías, notas, pie y textos de accesibilidad con los
     diccionarios de abajo. Precios, fotos y orden quedan idénticos a la carta en español.
  3. Agrega a cada foto el atributo data-item con el nombre en español, para que la analítica
     (view_item) cuente el mismo producto en los dos idiomas.
  4. Cambia el selector de idioma (Español → /carta), el <head> y lang="en".

Si la carta en español cambia (producto nuevo, descripción distinta), el script se detiene y lista
los textos que faltan por traducir. Se agregan a los diccionarios y se vuelve a correr.
"""
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / "carta" / "index.html"
SALIDA = RAIZ / "en" / "menu" / "index.html"

# Nombre del producto en español (tal como sale en el HTML) → inglés.
NOMBRES = {
    # Café
    "Espresso doble": "Double espresso",
    "Tinto 7 oz": "Tinto 7 oz",
    "Long black 7 oz": "Long black 7 oz",
    "Café campesino": "Café campesino",
    "Italiano": "Italiano",
    "Café latte": "Latte",
    "Cappuccino 9 oz": "Cappuccino 9 oz",
    "Flat white": "Flat white",
    "Mocachino 9 oz": "Mochaccino 9 oz",
    "Affogato": "Affogato",
    "Macchiato": "Macchiato",
    # Filtrados y cold brew
    "Prensa francesa": "French press",
    "V60": "V60",
    "Chemex": "Chemex",
    "AeroPress": "AeroPress",
    "Cold brew": "Cold brew",
    "Coldbrew latte": "Cold brew latte",
    "Coldbrew tonic": "Cold brew tonic",
    "Coldbrew spritz": "Cold brew spritz",
    "Coldbrew passion": "Cold brew passion",
    "Coldbrew valluno": "Cold brew valluno",
    # Signatures y tés
    "Espresso tonic 16 oz": "Espresso tonic 16 oz",
    "Ice latte": "Iced latte",
    "Ice mocca": "Iced mocha",
    "Granizado de café 16 oz": "Coffee frappé 16 oz",
    "Té en agua": "Hot tea",
    "Té en leche": "Tea with milk",
    "Té frío": "Iced tea",
    "Chocolate artesanal con queso": "Artisan hot chocolate with cheese",
    "Chocolate artesanal sin queso": "Artisan hot chocolate",
    "Té chai": "Chai tea",
    # Brunch
    "Bowl de fruta": "Fruit bowl",
    "Avena con fruta": "Oatmeal with fruit",
    "Bagel Philadelphia": "Cream cheese bagel",
    "Bagel Philadelphia y mermelada": "Cream cheese and jam bagel",
    "Bagel con huevo": "Egg bagel",
    "Waffle de pandebono con sirope": "Pandebono waffle with syrup",
    "Waffle de pandebono con fresa, arándanos y salsa de chocolate": "Pandebono waffle with strawberries, blueberries and chocolate sauce",
    "Waffle de pandebono con tocineta y huevo": "Pandebono waffle with bacon and egg",
    "Quiche tocineta y dátiles": "Bacon and date quiche",
    "Quiche pollo y champiñones": "Chicken and mushroom quiche",
    "Quiche pesto": "Pesto quiche",
    "Plato chips artesanales de arracacha": "Artisan arracacha chips",
    # Sandwiches y panadería
    "Sandwich atún": "Tuna sandwich",
    "Sandwich jamón salami": "Ham and salami sandwich",
    "Sandwich serrano": "Serrano ham sandwich",
    "Sandwich vegetariano": "Veggie sandwich",
    "Bruschetta jamón serrano": "Serrano ham bruschetta",
    "Bruschetta burrata": "Burrata bruschetta",
    "Croissant de mantequilla": "Butter croissant",
    "Croissant almendras": "Almond croissant",
    "Croissant pistacho": "Pistachio croissant",
    "Rollo de canela": "Cinnamon roll",
    "Pan de chocolate": "Pain au chocolat",
    "Galleta con chips de chocolate": "Chocolate chip cookie",
    # Postres y refrescantes
    "Torta naranja con amapola": "Orange poppy seed cake",
    "Torta zanahoria con almendras": "Carrot and almond cake",
    "Torta chocolate con maracuyá": "Chocolate passion fruit cake",
    "Torta chocolate": "Chocolate cake",
    "Torta almojábana": "Almojábana cake",
    "Postre de limón": "Lemon dessert",
    "Cheesecake frutos rojos": "Red berry cheesecake",
    "Cheesecake frutos amarillos": "Yellow fruit cheesecake",
    "Soda de naranja": "Orange soda",
    "Soda de flor de jamaica": "Hibiscus soda",
    "Soda de miel jengibre": "Honey ginger soda",
    "Soda frutos rojos": "Red berry soda",
    "Soda frutos amarillos": "Yellow fruit soda",
    "Limonada natural": "Fresh lemonade",
    "Limonada cereza": "Cherry lemonade",
    "Limonada hierbabuena": "Mint lemonade",
    "Limonada de coco": "Coconut lemonade",
    # Smoothies y bebidas
    "Malteada vainilla": "Vanilla milkshake",
    "Malteada con fruta": "Fruit milkshake",
    "Smoothie en agua": "Smoothie (water-based)",
    "Smoothie en leche": "Smoothie (milk-based)",
    "Jugo natural en agua": "Fresh juice (water-based)",
    "Jugo natural en leche": "Fresh juice (milk-based)",
    "Kombucha": "Kombucha",
    "Gaseosa tamarindo": "Tamarind soda",
    "Agua manantial": "Spring water",
    "Agua manantial con gas": "Sparkling spring water",
    "Soda": "Club soda",
    "Coca-Cola": "Coca-Cola",
    "Coca-Cola Zero": "Coca-Cola Zero",
    # Cervezas y coctelería
    "Club Colombia Dorada": "Club Colombia Dorada",
    "Corona": "Corona",
    "Heineken": "Heineken",
    "Stella Artois": "Stella Artois",
    "Asahi": "Asahi",
    "Peroni": "Peroni",
    "Bruder maracuyá": "Bruder passion fruit",
    "Bruder IPA": "Bruder IPA",
    "Bruder wine": "Bruder wine",
    "Gin tonic": "Gin and tonic",
    "Frozen margarita": "Frozen margarita",
    "Mojito": "Mojito",
    "Copa de vino": "Glass of wine",
    "Media botella de vino": "Half bottle of wine",
    "Botella de vino": "Bottle of wine",
    "Shot amaretto": "Amaretto shot",
    "Shot ginebra": "Gin shot",
    "Shot vodka": "Vodka shot",
    "Shot whiskey": "Whiskey shot",
    "Botella aguardiente amarillo": "Bottle of aguardiente amarillo",
    "Botella whisky The Glenlivet": "Bottle of The Glenlivet whisky",
    # Para llevar
    "Café Pangea 500 g": "Pangea coffee 500 g",
    "Café Laurasia 250 g": "Laurasia coffee 250 g",
    "Café Gondwana 250 g": "Gondwana coffee 250 g",
    "Adición tocineta": "Add bacon",
    "Adición chantilly": "Add whipped cream",
    "Adición huevo": "Add egg",
    "Adición bola de helado": "Add a scoop of ice cream",
    "Adición michelada": "Make it a michelada",
}

# Descripción en español (tal como sale en el HTML) → inglés.
DESCRIPCIONES = {
    "Doble shot de espresso con extracción doble de espresso balanceado.": "A balanced double shot of espresso.",
    "Café filtrado, suave y tradicional.": "Colombia's everyday black coffee: filtered, smooth and traditional.",
    "Espresso servido sobre agua caliente conservando su crema y carácter.": "Espresso poured over hot water, keeping its crema and character.",
    "Preparación tradicional de café con panela y canela.": "Traditional Colombian coffee brewed with panela (unrefined cane sugar) and cinnamon.",
    "Espresso doble con agua caliente aparte.": "Double espresso with hot water on the side.",
    "Espresso doble con leche texturizada suave.": "Double espresso with silky steamed milk.",
    "Balance perfecto entre espresso y leche con textura cremosa.": "The perfect balance of espresso and milk, with a creamy texture.",
    "Espresso doble con leche de textura gruesa.": "Double espresso with thick, velvety milk.",
    "Chocolate Hershey&#x27;s, espresso doble y leche.": "Hershey&#x27;s chocolate, double espresso and milk.",
    "Helado de vainilla acompañado de un espresso doble caliente.": "Vanilla ice cream with a hot double espresso.",
    "Espresso con poca cantidad de leche texturizada.": "Espresso with a small touch of steamed milk.",
    "Extracción por inmersión de 8 horas, bebida fría con perfil achocolatado, amaderado y acidez media.": "8-hour immersion brew served cold, with chocolatey, woody notes and medium acidity.",
    "Cold brew con leche.": "Cold brew with milk.",
    "Cold brew mezclado con agua tónica.": "Cold brew mixed with tonic water.",
    "Refrescante combinación burbujeante, sirope de naranja artesanal y zumo natural de naranja.": "A refreshing sparkling mix with house-made orange syrup and fresh orange juice.",
    "Refrescante combinación burbujeante, sirope de panela artesanal con maracuyá.": "A refreshing sparkling mix with house-made panela syrup and passion fruit.",
    "Refrescante combinación burbujeante, sirope de panela artesanal con lulo.": "A refreshing sparkling mix with house-made panela syrup and lulo, a tangy Andean fruit.",
    "Espresso vibrante combinado con agua tónica.": "Vibrant espresso combined with tonic water.",
    "Latte frío cremoso y balanceado.": "A creamy, balanced cold latte.",
    "Chocolate, espresso y leche servidos fríos.": "Chocolate, espresso and milk, served cold.",
    "Bebida congelada ideal para días cálidos.": "A frozen coffee drink, perfect for warm days.",
    "Chocolate caliente artesanal acompañado de queso.": "Artisan hot chocolate served with cheese, the Colombian way.",
    "Chocolate artesanal con textura cremosa.": "Artisan hot chocolate with a creamy texture.",
    "Mezcla aromática de especias y té negro.": "An aromatic blend of spices and black tea.",
    "Selección de frutas frescas de temporada.": "A selection of fresh seasonal fruit.",
    "Avena acompañada de fruta fresca y leche.": "Oats with fresh fruit and milk.",
    "Bagel artesanal con queso Philadelphia.": "Artisan bagel with Philadelphia cream cheese.",
    "Combinación dulce y cremosa con queso Philadelphia y mermelada de frutos rojos.": "Sweet and creamy, with Philadelphia cream cheese and red berry jam.",
    "Bagel caliente con huevo preparado al momento y queso holandés.": "Warm bagel with a freshly cooked egg and Dutch cheese.",
    "Acompañado con dip de la casa.": "Crispy chips of arracacha, an Andean root vegetable, served with our house dip.",
    "Sandwich artesanal con mezcla de atún.": "Artisan sandwich with our tuna mix.",
    "Jamón y salami artesanal estilo alemán en pan artesanal de masa madre.": "German-style artisan ham and salami on artisan sourdough bread.",
    "Jamón serrano español en pan artesanal de masa madre y verduras frescas.": "Spanish serrano ham on artisan sourdough bread with fresh vegetables.",
    "Vegetales frescos y sabores balanceados, acompañados de burrata.": "Fresh vegetables and balanced flavors, served with burrata.",
    "Pan tostado con jamón serrano y toppings frescos.": "Toasted bread with serrano ham and fresh toppings.",
    "Pan tostado con burrata y toppings frescos.": "Toasted bread with burrata and fresh toppings.",
    "Fresa, mango, maracuyá, mora, lulo.": "Strawberry, mango, passion fruit, Andean blackberry or lulo.",
    "Flor de jamaica, menta, tamarindo.": "Hibiscus, mint or tamarind.",
    "Perfil balanceado y versátil para el día a día.": "A balanced, versatile profile for every day.",
    "Notas suaves y dulces con tostión equilibrada.": "Smooth, sweet notes with a balanced roast.",
    "Pregunta por nuestros high end y exóticos de temporada.": "Ask about our seasonal high-end and exotic coffees.",
}

# Textos fijos de la página: (español exacto en el HTML, inglés). Se exige que cada uno aparezca.
TEXTOS = [
    # <head>
    ('<html lang="es">', '<html lang="en">'),
    ("<title>Carta · Tierradentro Café Express</title>", "<title>Menu · Tierradentro Café Express</title>"),
    ('<meta name="description" content="Carta 2026 de Tierradentro Café Express: café de especialidad, filtrados, cold brew, brunch, sandwiches, postres y más. Mall Primavera Life, local 110, Armenia, Quindío.">',
     '<meta name="description" content="Tierradentro Café Express menu 2026: Colombian specialty coffee, manual brews, cold brew, brunch, sandwiches, desserts and more. Primavera Life Mall, store 110, Armenia, Quindío, Colombia.">'),
    ('<link rel="canonical" href="https://tierradentroexpress.com/carta">', '<link rel="canonical" href="https://tierradentroexpress.com/en/menu">'),
    ('<meta property="og:title" content="Carta · Tierradentro Café Express">', '<meta property="og:title" content="Menu · Tierradentro Café Express">'),
    ('<meta property="og:description" content="Café de especialidad en el Mall Primavera Life, Armenia. Mira la carta completa con fotos y precios.">',
     '<meta property="og:description" content="Colombian specialty coffee at Primavera Life Mall, Armenia. See the full menu with photos and prices.">'),
    ('<meta property="og:locale" content="es_CO">', '<meta property="og:locale" content="en_US">\n<meta property="og:locale:alternate" content="es_CO">'),
    # Portada
    ('<a class="lang" href="/en/menu" hreflang="en" lang="en" data-track="idioma_en">English</a>',
     '<a class="lang" href="/carta" hreflang="es" lang="es" data-track="idioma_es">Español</a>'),
    ('aria-label="Ir al inicio"', 'aria-label="Go to home page"'),
    ('<p class="eyebrow">Carta 2026 · Mall Primavera Life</p>', '<p class="eyebrow">Menu 2026 · Primavera Life Mall</p>'),
    ('<p class="motto">Mentalidad global, actitud local.</p>', '<p class="motto">Global mindset, local attitude.</p>'),
    # Barra de categorías
    ('aria-label="Categorías"', 'aria-label="Categories"'),
    ('data-id="cafe">Café</a>', 'data-id="cafe">Coffee</a>'),
    ('data-id="filtrados">Filtrados</a>', 'data-id="filtrados">Manual brew</a>'),
    ('data-id="postres">Postres</a>', 'data-id="postres">Desserts</a>'),
    ('data-id="bar">Cervezas</a>', 'data-id="bar">Beer &amp; cocktails</a>'),
    ('data-id="home">Para llevar</a>', 'data-id="home">Take home</a>'),
    # Títulos de sección
    ("<h2>Café</h2>", "<h2>Coffee</h2>"),
    ("<h2>Filtrados &amp; cold brew</h2>", "<h2>Manual brews &amp; cold brew</h2>"),
    ('<p class="secsub">Métodos que resaltan el origen y perfil de cada café.</p>',
     '<p class="secsub">Brewing methods that bring out the origin and profile of each coffee. X2 serves two, X4 serves four.</p>'),
    ("<h2>Signatures &amp; tés</h2>", "<h2>Signatures &amp; teas</h2>"),
    ("<h2>Sandwiches &amp; panadería</h2>", "<h2>Sandwiches &amp; bakery</h2>"),
    ("<h2>Postres &amp; refrescantes</h2>", "<h2>Desserts &amp; refreshers</h2>"),
    ("<h2>Smoothies &amp; bebidas</h2>", "<h2>Smoothies &amp; drinks</h2>"),
    ("<h2>Cervezas &amp; coctelería</h2>", "<h2>Beer &amp; cocktails</h2>"),
    ("<h2>Café para llevar</h2>", "<h2>Coffee to take home</h2>"),
    # Grupos
    ('<h3 class="glabel">Con leche</h3>', '<h3 class="glabel">With milk</h3>'),
    ('<h3 class="glabel">Filtrados</h3>', '<h3 class="glabel">Manual brews</h3>'),
    ('<h3 class="glabel">Tés &amp; chocolates</h3>', '<h3 class="glabel">Teas &amp; hot chocolate</h3>'),
    ('<h3 class="glabel">Waffles &amp; especiales</h3>', '<h3 class="glabel">Waffles &amp; specials</h3>'),
    ('<h3 class="glabel">Panadería</h3>', '<h3 class="glabel">Bakery</h3>'),
    ('<h3 class="glabel">Postres</h3>', '<h3 class="glabel">Desserts</h3>'),
    ('<h3 class="glabel">Refrescantes</h3>', '<h3 class="glabel">Refreshers</h3>'),
    ('<h3 class="glabel">Jugos &amp; bebidas</h3>', '<h3 class="glabel">Juices &amp; drinks</h3>'),
    ('<h3 class="glabel">Cervezas</h3>', '<h3 class="glabel">Beers</h3>'),
    ('<h3 class="glabel">Bruder &amp; coctelería</h3>', '<h3 class="glabel">Bruder &amp; cocktails</h3>'),
    ('<h3 class="glabel">Vinos &amp; shots</h3>', '<h3 class="glabel">Wine &amp; shots</h3>'),
    ('<h3 class="glabel">Adiciones</h3>', '<h3 class="glabel">Add-ons</h3>'),
    # Notas
    ('<p class="note">Pregunta por nuestras opciones de leche vegetal.</p>', '<p class="note">Ask about our plant-based milk options.</p>'),
    ('<p class="note">Pregunta por nuestras líneas Exotic y High End de temporada.</p>', '<p class="note">Ask about our seasonal Exotic and High End lines.</p>'),
    ('<p class="note">Nuestros tés provienen de Asia oriental, Asia meridional y cultivos colombianos.</p>',
     '<p class="note">Our teas come from East Asia, South Asia and Colombian farms.</p>'),
    ('<p class="note">Preparación inspirada en sabores locales.</p>',
     '<p class="note">Inspired by local flavors. Pandebono is a Colombian cheese bread made with cassava starch.</p>'),
    # Pie
    ('<p class="motto">De un humano a otro, parchate.</p>', '<p class="motto">From one human to another, come hang out.</p>'),
    ("<p>Tierradentro Café Express · Mall Primavera Life, local 110 · Armenia, Quindío</p>",
     "<p>Tierradentro Café Express · Primavera Life Mall, store 110 · Armenia, Quindío, Colombia</p>"),
    ("<b>314 655 1487</b>", "<b>+57 314 655 1487</b>"),
    (">Califícanos en Google</a>", ">Rate us on Google</a>"),
    ("<p>Precios en pesos colombianos. Toca una foto para verla en grande.</p>",
     "<p>Prices in Colombian pesos (COP). Tap a photo to see it larger.</p>"),
    ('<a class="btn" href="/">Ir al inicio</a>', '<a class="btn" href="/">Home page (Spanish)</a>'),
    # Visor de fotos
    ('aria-label="Foto del producto"', 'aria-label="Product photo"'),
    ('type="button">Cerrar</button>', 'type="button">Close</button>'),
    ('aria-label="Foto anterior"', 'aria-label="Previous photo"'),
    ('aria-label="Foto siguiente"', 'aria-label="Next photo"'),
]

HREFLANG = (
    '<link rel="alternate" hreflang="es" href="https://tierradentroexpress.com/carta">\n'
    '<link rel="alternate" hreflang="en" href="https://tierradentroexpress.com/en/menu">\n'
)


def traducir(html: str) -> str:
    faltan = []

    def nombre(es):
        if es not in NOMBRES:
            faltan.append(f"NOMBRE: {es}")
            return es
        return NOMBRES[es]

    def desc(es):
        if es not in DESCRIPCIONES:
            faltan.append(f"DESCRIPCION: {es}")
            return es
        return DESCRIPCIONES[es]

    # Botón de foto: guardar el nombre en español para la analítica y traducir sus atributos.
    def boton(m):
        tag = m.group(0)
        es = re.search(r'data-name="([^"]*)"', tag).group(1)
        en = nombre(es)
        tag = tag.replace(f'data-name="{es}"', f'data-item="{es}" data-name="{en}"', 1)
        tag = re.sub(r'data-desc="([^"]+)"', lambda d: f'data-desc="{desc(d.group(1))}"', tag)
        return tag.replace(f'aria-label="Ver foto de {es}"', f'aria-label="See photo of {en}"')

    html = re.sub(r'<button class="thumb"[^>]*>', boton, html)
    html = re.sub(r'(<img src="/img/t[^"]+" alt=")([^"]*)(")', lambda m: m.group(1) + nombre(m.group(2)) + m.group(3), html)
    html = re.sub(r"<h4>([^<]+)</h4>", lambda m: f"<h4>{nombre(m.group(1))}</h4>", html)
    html = re.sub(r'<p class="desc">([^<]+)</p>', lambda m: f'<p class="desc">{desc(m.group(1))}</p>', html)

    for es, en in TEXTOS:
        if es not in html:
            faltan.append(f"TEXTO: {es}")
        html = html.replace(es, en)

    # hreflang ya viene de la carta en español; si no, se agrega.
    if 'hreflang="en"' not in html.split("</head>")[0]:
        html = html.replace('<meta property="og:type"', HREFLANG + '<meta property="og:type"', 1)

    if faltan:
        sys.exit("Faltan traducciones (agregarlas a los diccionarios):\n  " + "\n  ".join(faltan))
    return html


if __name__ == "__main__":
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(traducir(ORIGEN.read_text(encoding="utf-8")), encoding="utf-8")
    print(f"OK -> {SALIDA} ({SALIDA.stat().st_size} bytes)")
