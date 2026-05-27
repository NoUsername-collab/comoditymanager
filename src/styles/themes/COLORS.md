# Casa Emil — Theme Contract

Sursa de adevăr pentru tema activă este acum:

```text
src/styles/themes/
├── _base.css
├── globals.css
├── default-day.css
└── default-night.css
```

## Reguli

1. În runtime rămâne activă doar tema `default`.
2. Varianta vizuală se schimbă doar prin `data-mode="day"` sau `data-mode="night"`.
3. O temă nouă trebuie să copieze exact patternul:
   - `[theme]-day.css`
   - `[theme]-night.css`
   - aceleași variabile ca în `default-day.css` / `default-night.css`
4. Zero culori hardcodate în componente noi. Folosește doar variabile CSS.

## Runtime actual

```html
<html data-theme="default" data-mode="day">
<html data-theme="default" data-mode="night">
```

## Ce s-a scos

- palete multiple de admin
- teme `win95` / `winxp`
- teme country / generic color
- switcherul de teme din site-ul public

## Extindere viitoare

Pentru o temă nouă:

1. creezi `mytheme-day.css`
2. creezi `mytheme-night.css`
3. definești aceleași variabile ca în `default-*`
4. o imporți explicit în lanțul CSS doar când chiar vrei s-o activezi

Până atunci, aplicația rulează doar pe `default`.
