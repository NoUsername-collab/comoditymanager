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
| Spine 4px pe **rândul clădire** (sidebar stânga) | **Done** — `::before` 4px (`--building-spine`) | `globals.css`, `gantt-mobile.css`, `GanttVirtualizedBody.tsx` |
| Gradient pe chrome Gantt (header viewport, summary, room column) | **Parțial** — chrome principal flat; rămân zone toolbar/mobile | `gantt-premium.css`, `globals.css` |
| Legendă footer cu swatch gradient | **Done** — swatch-uri token `--gantt-bar-fill-*` | `GanttFooterLegend.tsx`, `globals.css` |
| Bară turnover (azi check-out + check-in) cu gradient | **Done** — hard-stop flat 50/50 | `admin-gantt-stay-chip.css` |
| Hold/block: shadow pe chip | **Done** — `box-shadow: none` | `admin-gantt-stay-chip.css` |
| Componente TSX cu `bg-gradient-*` în Gantt | **Done** | `GanttDayHeader`, `GanttTodayPanel`, `GanttQuickActionPanel` |

### P1 — admin operațional flat

| Item | Stare | Fișiere |
|------|-------|---------|
| Dashboard hero „liquid” / mood gradients | **Delight zone** — documentat; KPI flat | `admin-home.css` |
| Disponibilitate premium panels | **Done** | `availability-premium.css`, `AvailabilityDatePicker.tsx` |
| Check-in flow | **Done** (operațional; print factură neschimbat) | `admin-checkin.css` |
| Toolbar cazări | **Done** — alert cereri flat | `admin-cazari-toolbar.css` |
| Clasa `.admin-surface-card` | **Adoptată** în TSX cheie | `admin-surfaces.css`, statistici, disponibilitate, quick panel |
| Istoric, feedback, simulare, guests | **Parțial** | diverse `admin-*.css` |

### P2 — curățenie & consistență

- [x] Comentariu `Nestio` → `Hospira` în `platform-split.css`; gradiente marketing header flatten parțial
- [x] `GanttFooterLegend` — swatch-uri plate ca în UI real
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

## 6. Status sinteză (2026-06-22, post P0/P1)

| Zonă | Aliniere | Notă |
|------|----------|------|
| **Bare Gantt stay** | ~95% | Flat + spine + cap + turnover hard-stop |
| **Chrome Gantt** | ~75% | Header/summary/viewport/toolbar flat; mobile + zone secundare rămân |
| **Rând clădire (spine sidebar)** | ~90% | 4px desktop / 2px compact, `--building-spine` |
| **Admin flat (setări, cazări, check-in, avail.)** | ~80% | Tokeni + `.admin-surface-card`; guests/history parțial |
| **Dashboard** | ~70% | KPI flat; hero liquid = delight zone documentat |
| **Check-in / disponibilitate** | ~85% | Operațional flat; print factură intact |
| **Site public** | N/A | Brand deliberate, nu țintă flat PMS |
| **Platformă Hospira** | ~85% | Naming Hospira; marketing header flat solid |

**Verdict:** P0 Gantt + P1 operațional major **implementate**; rămân P2 (noapte, setări UI copy, guests/history/simulation sweep).

---

## 7. Plan implementare AI (agent)

Plan executabil pentru agent Cursor / sesiuni viitoare. Estimări: **S** ≤1h, **M** 1–3h, **L** 3–6h.

### Ce NU se atinge

| Zonă | Motiv |
|------|--------|
| `public-site.css` | Brand public — gradiente/atmosferă deliberate |
| `issued-invoice-sheet__header` / print facturi | Gradient header acceptabil (roadmap out of scope) |
| Bare Gantt stay deja flat | `gantt-cards-theme.css`, `--gantt-bar-fill-*` — doar regresie |
| Hero dashboard `--liquid` | Delight zone; KPI/secțiuni operaționale = flat |

### Faza A — P0 Gantt chrome (prioritate maximă) ✅ Done 2026-06-22

| # | Task | Fișiere | Efort | DoD |
|---|------|---------|-------|-----|
| A1 | Spine 4px rând clădire (`--building-spine`) | `globals.css`, `gantt-mobile.css`, `GanttVirtualizedBody.tsx` | S | Bandă vizibilă stânga; 2px pe compact |
| A2 | Flat chrome: shell, head row, summary, viewport | `gantt-premium.css`, `globals.css` | M | Fără `linear-gradient` pe header zile/coloane |
| A3 | Legendă footer swatch token | `GanttFooterLegend.tsx`, `globals.css` | S | Swatch = culori reale bare |
| A4 | Turnover + hold/block flat | `admin-gantt-stay-chip.css` | S | Hard-stop 50/50; occ chip fără shadow |
| A5 | TSX Gantt fără `bg-gradient-*` | `GanttDayHeader`, `GanttTodayPanel`, `GanttQuickActionPanel` | S | `--admin-surface-bg` / clase CSS |

### Faza B — P1 admin operațional ✅ Done 2026-06-22 (major)

| # | Task | Fișiere | Efort | DoD |
|---|------|---------|-------|-----|
| B1 | Check-in flat (`--admin-tint-*`) | `admin-checkin.css` | M | 0 gradiente operaționale; print intact |
| B2 | Disponibilitate KPI + matrix | `availability-premium.css`, `AvailabilityDatePicker.tsx` | M | `--admin-surface-*` |
| B3 | Toolbar cazări alert flat | `admin-cazari-toolbar.css` | S | Fără sweep gradient |
| B4 | Dashboard KPI flat; hero delight | `admin-home.css` | M | Comentariu delight; KPI fără glow |
| B5 | `.admin-surface-card` în TSX | statistici, disponibilitate, quick panel | S | ≥4 componente adoptate |
| B6 | Platform Hospira naming + flat ops | `platform-split.css` | S | Comentariu Hospira; footer/logo solid |

### Faza C — P2 curățenie (rămas)

| # | Task | Fișiere | Efort | DoD |
|---|------|---------|-------|-----|
| C1 | Audit temă noapte Gantt | `default-night.css`, `admin-night-overrides.css` | M | Spine + cap health contrast AA |
| C2 | Sweep guests/history/feedback/simulation | `admin-guests.css`, `admin-history.css`, etc. | L | 0 gradient operațional |
| C3 | Gantt mobile chrome rămas | `gantt-mobile.css` | M | `--gantt-day-nav-bg` etc. flat |
| C4 | gantt-premium zone secundare | `gantt-premium.css` (cereri queue, inline dock) | M | <5 gradiente rămase în shell |
| C5 | Copy Setări: Gantt semantic vs brand | componentă setări temă | S | Text vizibil operator |
| C6 | Mirror tokens TS dacă lipsesc chei | `tokens.ts` | S | Paritate `_base.css` |

### Ordine recomandată pentru agent

```
A (Gantt) → B (admin ops) → C1 (noapte) → C3/C4 (Gantt rest) → C2 (sweep CSS) → C5/C6
```

### Prompt tip pentru sesiune următoare

> Continuă flat alignment per `docs/design-color-roadmap.md` Faza C. Folosește `--admin-surface-*`, `--gantt-bar-fill-*`, `tokens.ts`. Nu atinge public-site / invoice print. Actualizează checkbox-uri roadmap. Rulează `tsc` + teste relevante.
