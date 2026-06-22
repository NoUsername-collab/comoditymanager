# Roadmap culori & UI operațional — Hospira / Casa Emil

Document de design creat **2026-06-22** după review competitiv Gantt + pass flat admin.  
Nu exista un roadmap anterior dedicat culorilor (doar `docs/timeline-spec.md` — comportament Gantt, nu paletă).

---

## 1. Benchmark competitiv (PMS / channel managers)

Pattern-uri comune la produse mature (Mews, Cloudbeds, Little Hotelier, Beds24 etc.):

| Zonă | Ce fac competitorii | Implicație pentru noi |
|------|----------------------|------------------------|
| **Bare Gantt (stay)** | Fill plat, culoare **semantică** (confirmat / cerere / trecut), nu gradient pe bară | `--gantt-bar-fill-*` + `gantt-cards-theme.css` |
| **Spine clădire** | Bandă verticală subțire (~4px) cu culoarea clădirii; restul barei rămâne semantic | Spine pe bară: `--stay-spine`; spine pe rând clădire: marker lateral |
| **Text pe bară** | Minim sau zero; detalii în popover / tooltip | `.gantt-stay__surface-text { display: none }` |
| **Indicator cap (check-in)** | Cap dreapta verde/roșu pentru „gata de check-in” vs problemă | `capHealth` + `.gantt-stay--cap-ok` / `--cap-problem` |
| **Hold / block** | Hatch sau contur, fără efect 3D | Lane chip cu spine 3px |
| **Admin operațional** | Suprafețe plate, border subtil, fără glass/gradient pe liste și dashboard | Tokeni `--admin-surface-*`, `--admin-tint-*` |
| **Brand** | Logo / accent în header și site public, **nu** pe barele Gantt | Tema tenant în shell; Gantt rămâne semantic |
| **Platformă Hospira** | Marketing separat de PMS tenant (nu confundat cu Nestio legacy) | `platform-split.css` — de aliniat naming |

---

## 2. Ce s-a făcut (sesiunea curentă)

### Gantt — bare și semantică

- [x] Fill plat pe bare stay (`src/styles/themes/gantt-cards-theme.css`) — `background-image: none`, fără shadow pe card
- [x] Tokeni `--gantt-bar-fill-active|pending|past` în `_base.css`
- [x] Spine 4px pe bare stay (`admin-gantt-stay-chip.css`, `--stay-spine` din culoarea clădirii)
- [x] Fără text pe suprafața barei; badge-uri + cap rămân
- [x] Cap health verde/roșu (`GanttBookingBar`, `capHealth`, end-tab ok/problem)
- [x] Layout rând clădire desktop — summary flush, fără „dead band” (`gantt-premium.css` § desktop calendar)
- [x] Eliminat `logo-auto-theme` (tema nu mai derivă automat din logo)

### Admin flat pass (parțial)

- [x] Contract tokeni: `src/styles/tokens/admin-surfaces.css`, variabile în `_base.css`, mirror TS `src/domain/design/tokens.ts`
- [x] **Setări** — fără `linear-gradient` în `admin-settings.css`; folosește `--admin-surface-*`
- [x] **Dashboard** — carduri hero/KPI folosesc `--admin-surface-bg` / `--admin-surface-shadow: none` (dar hero „liquid” păstrează efecte)
- [x] **Cazări / features / guests** — adoptare parțială tokeni suprafață

### Temă & platformă

- [x] Gantt rămâne pe paletă semantică booking, independent de brand tenant
- [x] Brand în header admin / site public (variabile `--admin-accent`, `--site-*`)
- [x] Platformă Hospira (rute `hospira-admin`, componente `hospira-admin/`)

---

## 3. Ce rămâne TODO (prioritizat)

### P0 — aliniere Gantt la benchmark

| Item | Stare | Fișiere |
|------|-------|---------|
| Spine 4px pe **rândul clădire** (sidebar stânga) | **Lipsă** — `::before` dezactivat (`content: none`) | `globals.css`, `gantt-mobile.css` |
| Gradient pe chrome Gantt (header viewport, summary, room column) | **Rămas** (~46× `linear-gradient` în shell) | `gantt-premium.css`, `globals.css` |
| Legendă footer cu swatch gradient | **Rămas** | `GanttFooterLegend.tsx` |
| Bară turnover (azi check-out + check-in) cu gradient | **Rămas** | `admin-gantt-stay-chip.css` |
| Hold/block: shadow pe chip | **Parțial** — încă `box-shadow` | `admin-gantt-stay-chip.css` |
| Componente TSX cu `bg-gradient-*` în Gantt | **Rămas** | `GanttDayHeader`, `GanttTodayPanel`, `GanttQuickActionPanel` |

### P1 — admin operațional flat

| Item | Stare | Fișiere |
|------|-------|---------|
| Dashboard hero „liquid” / mood gradients | **Rămas** (~16 gradiente) | `admin-home.css`, `admin-liquid-shader.css` |
| Disponibilitate premium panels | **Rămas** | `availability-premium.css`, `AvailabilityDatePicker.tsx` |
| Check-in flow | **Rămas** (12 gradiente) | `admin-checkin.css` |
| Toolbar cazări | **Rămas** | `admin-cazari-toolbar.css` |
| Clasa `.admin-surface-card` | **Definită, nefolosită în TSX** | `admin-surfaces.css` — migrare componente |
| Istoric, feedback, simulare, guests | **Parțial** | diverse `admin-*.css` |

### P2 — curățenie & consistență

- [ ] Comentariu `Nestio` → `Hospira` în `platform-split.css`; decide dacă gradientele marketing rămân
- [ ] `GanttFooterLegend` — swatch-uri plate ca în UI real
- [ ] Audit noapte (`default-night.css`) — spine Gantt, contrast cap health
- [ ] Documentare în UI Setări: „Gantt = semantic, brand = header”

### Out of scope (intenționat)

- **Site public** (`public-site.css`) — gradiente și atmosferă brand OK
- **Facturi print** — header gradient acceptabil
- **Shader hero opțional** — poate rămâne ca „delight” dacă nu deranjează scanarea KPI

---

## 4. Principii pentru viitor

1. **Două straturi de culoare**
   - **Operațional (PMS):** semantic booking + suprafețe flat (`--admin-surface-*`, `--booking-*`, `--gantt-bar-fill-*`).
   - **Brand (tenant):** accent, logo, site public — nu suprascrie barele Gantt.

2. **Sursă unică de adevăr**
   - CSS: `src/styles/themes/_base.css` + teme day/night.
   - Native (WinUI / React Native): `src/domain/design/tokens.ts` — aceleași chei, fără duplicate hardcodate.

3. **Gantt**
   - Bare: fill plat, spine clădire, cap status, fără nume oaspete pe bară.
   - Chrome (grid, header zile): flat sau tint foarte subtil; fără gradient pe elemente de date.

4. **Admin**
   - Card = `border` + `background` solid + `box-shadow: none` (sau `--admin-elevation-shadow` doar pentru modale).
   - Tint semantic: `--admin-tint-info|warning|success|danger` — fundal 6–10% accent, nu gradient.

5. **Review înainte de regresie**
   - Orice PR care adaugă `linear-gradient` în `src/app/admin/` necesită justificare în acest doc.

---

## 5. Referințe cod

| Rol | Path |
|-----|------|
| Tokeni globali | `src/styles/themes/_base.css` |
| Override bare Gantt | `src/styles/themes/gantt-cards-theme.css` |
| Chip stay / spine / cap | `src/app/admin/admin-gantt-stay-chip.css` |
| Shell Gantt (multe gradiente rămase) | `src/app/admin/gantt-premium.css` |
| Tokeni admin flat | `src/styles/tokens/admin-surfaces.css` |
| Mirror native | `src/domain/design/tokens.ts` |
| Spec comportament Gantt (nu culori) | `docs/timeline-spec.md` |

---

## 6. Status sinteză (2026-06-22)

| Zonă | Aliniere | Notă |
|------|----------|------|
| **Bare Gantt stay** | ~90% | Flat + spine + cap OK; turnover + legendă încă cu gradient |
| **Chrome Gantt** | ~40% | Multe gradiente pe header/grid |
| **Rând clădire (spine sidebar)** | ~0% | Explicit dezactivat; de reimplementat |
| **Admin flat (setări, cazări parțial)** | ~60% | Tokeni există; acoperire incompletă |
| **Dashboard** | ~50% | Carduri flat; hero liquid cu gradiente |
| **Check-in / disponibilitate** | ~30% | Premium styling încă gradient-heavy |
| **Site public** | N/A | Brand deliberate, nu țintă flat PMS |
| **Platformă Hospira** | ~70% | Funcțional; CSS marketing încă „Nestio” în comentarii |

**Verdict:** direcția corectă pe **barele Gantt** și **contract tokeni**; codebase-ul **nu e 100% aliniat** — shell Gantt, dashboard hero, check-in și disponibilitate au încă multe gradiente operaționale.
