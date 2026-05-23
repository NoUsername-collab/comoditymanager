# Logo Casa Emil

Pune fișierele tale aici:

| Fișier | Utilizare |
|--------|-----------|
| `logo.svg` | Logo principal (înlocuiește placeholder-ul) |
| `logo.png` | Alternativă raster (opțional, componenta preferă SVG) |

## Recomandări pentru animație path

- Pentru **desenare la încărcare** (ca acum): SVG cu linii `stroke`, fără fill complex.
- Adaugă clase pe path-uri: `brand-draw`, `brand-draw-delay`, `brand-draw-delay-2` (vezi exemplul curent).
- Culori pensiune: cald `#b45309` (acoperiș), rece `#1e3a5f` (casă).

## Logo plin (fill)

Dacă logo-ul tău e doar forme pline, păstrează `logo.svg` — animația va fi un **fade + ușor scale** (fără desenare linie).

După înlocuire: reîncarcă site-ul (Ctrl+F5).
