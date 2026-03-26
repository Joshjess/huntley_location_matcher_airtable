# 🔍 Vacature Locatie Zoeker — Airtable Extension

Zoek vacatures binnen een straal van een opgegeven locatie met automatische coördinaten-cascade.

## Hoe het werkt

De extensie zoekt coördinaten in deze volgorde:

1. **Vacature** — Controleert latitude/longitude velden op de vacature zelf
2. **Bedrijf** — Als de vacature geen coördinaten heeft, kijkt het naar het gekoppelde bedrijf
3. **Locaties** — Als het bedrijf ook geen coördinaten heeft, zoekt het in de gekoppelde Locaties tabel

Afstanden worden berekend met de **Haversine-formule** en gefilterd op de opgegeven straal.

## Vereiste tabelstructuur

### Vacatures tabel
| Veld | Type | Beschrijving |
|------|------|-------------|
| Latitude | Number | Breedtegraad van de vacature |
| Longitude | Number | Lengtegraad van de vacature |
| Bedrijf | Linked Record | Link naar Bedrijven tabel |

### Bedrijven tabel
| Veld | Type | Beschrijving |
|------|------|-------------|
| Latitude | Number | Breedtegraad van het bedrijf |
| Longitude | Number | Lengtegraad van het bedrijf |
| Locaties | Linked Record | Link naar Locaties tabel |

### Locaties tabel
| Veld | Type | Beschrijving |
|------|------|-------------|
| Latitude | Number | Breedtegraad van de locatie |
| Longitude | Number | Lengtegraad van de locatie |

## Installatie

```bash
# 1. Installeer dependencies
npm install

# 2. Start development server
npm start

# 3. Voeg de extensie toe aan je Airtable base
#    → Ga naar Extensions → Add an extension → "Remix from GitHub" of "Build a custom extension"
#    → Plak de development URL
```

## Configuratie

1. Open de extensie in Airtable
2. Klik op **⚙️ Instellingen**
3. Selecteer je tabellen en velden:
   - Vacatures tabel + lat/lon velden + link naar bedrijven
   - Bedrijven tabel + lat/lon velden + link naar locaties
   - Locaties tabel + lat/lon velden
4. Sluit instellingen en begin met zoeken

## Gebruik

1. Typ een locatienaam (bijv. "Amsterdam", "Utrecht Centrum")
2. Selecteer een straal (5–100 km)
3. Klik **Zoeken** of druk op Enter
4. Resultaten verschijnen gesorteerd op afstand
5. Klik op een resultaat om het record in Airtable te openen

## Geocoding

Locatienamen worden omgezet naar coördinaten via de **OpenStreetMap Nominatim API** (gratis, geen API-key nodig). De zoekopdracht is beperkt tot Nederland (`countrycodes=nl`).

## Stats

Na elke zoekopdracht zie je:
- **Gevonden** — Totaal aantal vacatures binnen de straal
- **📍 Vacature** — Gevonden via vacature-coördinaten
- **🏢 Bedrijf** — Gevonden via bedrijf-coördinaten
- **📌 Locatie** — Gevonden via locatie-coördinaten
- **Geen coörd.** — Vacatures zonder enige coördinaten
