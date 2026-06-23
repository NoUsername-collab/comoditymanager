# Performance roadmap — Hospira / Casa Emil

Actualizat **2026-06-22**.

## Implementat

| Zonă | Optimizare |
|------|------------|
| **Gantt** | `GanttCalendarLazy` (dynamic, fără SSR), virtualizare rânduri (`GanttVirtualizedBody`) |
| **Calendar data** | `loadCalendarCoreData` — `Promise.all` + `cache()` per request |
| **Bookings** | `unstable_cache` 45s pe range Gantt; cereri count 30s |
| **Buildings dashboard** | `unstable_cache` 45s (bypass când sim activ) |
| **Setup issues** | Context onboarding cache 120s; MFA doar când e relevant |
| **MRZ / OCR** | `MrzScanPanel` lazy în dialog; `tesseract.js` încărcat la captură; worker terminat la închidere |
| **Bundle** | `optimizePackageImports` în `next.config.ts` |
| **Prefetch** | Calendar/statistics/disponibilitate — fără prefetch eager la mount |
| **CSS** | `admin-settings.css` deferit pe layout settings; login CSS pe rută |
| **Settings** | `loadSettingsStaffContext` cache + parallel staff/pension |
| **Camera** | `Permissions-Policy: camera=(self)` pentru scan MRZ |

## Verificare

```bash
npm run analyze   # bundle analyzer (ANALYZE=true)
npm test
npx tsc --noEmit
```

## TODO (prioritizat)

1. ~~**Prefetch** — evită prefetch rute grele (calendar) pe linkuri secundare~~ ✓
2. **Guest profiles** — batch attach la liste mari de bookings (monitor N+1)
3. **Statistics** — cache agregări anuale (heavy compute)
4. **Images** — `next/image` pe site public unde lipsește
5. **Service worker** — out of scope web; pregătit pentru app nativă

## Principii

- Cache cross-request doar date **read-mostly**; bypass la **sim mode**
- Lazy-load module grele: `tesseract.js`, Gantt client, MRZ panel
- Tag-uri cache aliniate cu `CACHE_TAGS` + `revalidateTag` la mutații
