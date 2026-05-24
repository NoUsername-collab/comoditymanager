# Timeline & occupancy — specificație v0.2 (contract)

Document de produs **înainte de implementare**. Toate feature-urile timeline / hold / block / mutare cameră / clienți trebuie să respecte această spec.

**Status:** Phase 0 închis — decizii transate (2026-05-20).

---

## 1. Principiu central

> Orice ocupă o cameră într-un interval `(room_id, check_in, check_out)` este un **occupancy segment** consumat de același API.

Serviciu unic țintă: `getRoomOccupancy(from, to)` → Gantt, disponibilitate, conflicte, calendar public.

### Kind-uri (tip ocupare)

| Kind | Română | Blochează disponibilitate | Pe Gantt | Calendar public |
|------|--------|---------------------------|----------|-----------------|
| `hold` | Reținere operator | Da | Da | Nu (intern) |
| `request` | Cerere neconfirmată | Da | Da | Nu |
| `stay` | Cazare confirmată | Da | Da | Reduce disponibilitatea |
| `block` | Blocare cameră | Da | Da | Da (indisponibil) |

---

## 2. Stări temporale (calculate, nu stocate)

| Fază | Condiție |
|------|----------|
| `past` | `check_out <= azi` |
| `active` | `check_in <= azi < check_out` |
| `future` | `check_in > azi` |
| `cancelled` | `status = anulata` — ascuns sau ghost |

### Reprezentare vizuală Gantt

| Kind + fază | Stil propus |
|-------------|-------------|
| `hold` | Contur punctat, galben, fără nume oaspete |
| `request` + future | Semi-transparent, inițiale / „?” |
| `stay` + future | Solid, culoare clădire |
| `stay` + active | Border accent + badge „AZI” |
| `stay` + past | Desaturat, read-only |
| `block` | Hatch diagonal, gri, etichetă motiv |

Filtre toolbar: cereri · confirmate viitoare · in-house · trecute · hold · blocări.

---

## 3. Hold operator

### Scop

„Ține-mi camera X (sau N camere) până decid” — fără oaspete final, fără cerere publică.

### Câmpuri

- `room_id`(e)
- `check_in`, `check_out`
- `reason` (opțional)
- `expires_at` (opțional) — setat de operator: expiră după **X ore**
- `released_at` / `released_by` — eliberare manuală

### Reguli expirare (transate)

1. Dacă operatorul setează **X ore** → hold expiră automat la `created_at + X ore` (sau `expires_at` explicit).
2. Dacă **nu** setează ore → **nu se deblochează automat**; rămâne până eliberează operatorul manual.
3. Hold expirat = tratat ca eliberat (segment dispare din occupancy); opțional notificare admin.

### UI

- Apare pe **Gantt** (prioritate vizuală față de fundal liber).
- Toolbar: „Hold” → select cameră(e) + interval + ore opționale + motiv.
- Context menu: eliberare, conversie → cerere / cazare directă (păstrează camerele).

---

## 4. Blocare cameră (`block`)

### Scop

Cameră indisponibilă: mentenanță, defect, uz personal — **nu** vânzare.

### Reguli

- Apare pe Gantt (hatch).
- **Reduce disponibilitatea pe calendar public** (ca și o cazare).
- Motiv obligatoriu (listă + „altul”).
- Buton dedicat în toolbar Gantt + opțiune în popup drag-create.

---

## 5. Drag-create pe timeline

### Comportament (desktop + touch)

```
pointerdown pe celulă (room R, day D0)
  → anchor = D0
pointermove spre dreapta
  → ghost bar crește [D0 … Dn], snap 1 coloană = 1 noapte
  → verde = liber, roșu = conflict
pointerup
  → check_in = D0
  → check_out = Dn + 1  (checkout exclusiv)
  → popup: Blocare | Hold | Cerere | Cazare directă
```

| Regulă | Valoare |
|--------|---------|
| Direcție create | Doar spre dreapta; drag stânga = anulare |
| Minim | 1 noapte |
| Cameră | Rândul unde a început drag-ul |
| Server | Recalculează interval + conflict check atomic |
| Undo | Toast + revert ~10s după create greșit |

### Mobil

- **Long-press ~400ms** pe celulă goală = același meniu ca click dreapta desktop.
- Long-press + drag dreapta = același ghost bar.

---

## 6. Mutare cameră — model modular (split card)

### Problema

Oaspete în cam 4, sejur 1–10 ian; după 3 nopți mută în cam 7. **Nu** mutăm un bloc monolit.

### Model: `booking_room_segments`

```
booking_id, room_id, segment_start, segment_end [, nightly_rate snapshot]
```

Exemplu: cam 4 (1→4 ian, 3 nopți) + cam 7 (4→10 ian, 6 nopți).

### Reguli

| Regulă | Decizie |
|--------|---------|
| Pivot mutare | Doar **de azi înainte** (segmente trecute read-only) |
| Multi-cameră | Muți **o cameră** din grup; restul neschimbate |
| Preț | Sumă per segment: nopți × preț cameră segment |
| Gantt | 2+ bare același `booking_id`, culoare oaspete, lipite/connector |
| Audit | Activity log: split + mutare |

### UI v1 mutare

Context menu → „Mută cameră (de azi)” → cameră țintă → preview split → confirm.

**Drag vertical** pe card (mutare directă pe alt rând): faza ulterioară, după split din meniu.

---

## 7. Drag pe card existent

| Acțiune | Comportament |
|---------|--------------|
| Drag orizontal | Mutare date (există parțial) — aceleași camere/segmente |
| Drag vertical | **Nu în v0.2 inițial** — mutare cameră doar din meniu + split |

---

## 8. Context menu (master controller)

### Click dreapta / long-press pe **card**

- Deschide detalii
- Confirmă (dacă cerere)
- Anulează
- Mută date…
- Mută cameră… (split)
- Convertește hold → cerere / cazare
- Prelungește / scurtează
- Duplică / rebook similar
- Istoric acțiuni
- Copiază link admin

### Click dreapta / long-press pe **celulă goală**

- Creează cerere
- Creează cazare directă
- Hold cameră
- Blocare cameră
- Disponibilitate săptămână

---

## 9. Clienți (`guests`)

### Identitate

| Câmp | Regulă |
|------|--------|
| `phone` | Normalizat E.164; unique când setat |
| `email` | lowercase trim; unique când setat |
| Matching | 1) telefon 2) email 3) conflict → UI merge manual |
| Minim | Telefon **sau** email |

### Cerere publică

Auto-link `guest_id` dacă telefon sau email există; altfel guest nou.

### Pagină client

- Istoric sejururi + segmente
- Rebook ultima dată / aceeași perioadă an viitor
- Note, tag-uri (VIP, recurent)
- GDPR: anonimizare ulterior (out of scope v0.2)

---

## 10. Out of scope v0.2

- Channel manager (Booking.com)
- e-Factura / fiscal
- Housekeeping app separată
- Dynamic pricing / revenue management
- Multi-proprietate
- Polițe anulare / depozite (v0.3+)

---

## 11. Roadmap implementare

Ordinea **obligatorie** (nu sări faze):

| Fază | Livrabil |
|------|----------|
| **1** | DB segments + occupancy API unificat + conflicte | ✅ cod (migrare 009) |
| **2** | Vizual Gantt: past / active / future / hold / block | ✅ cod |
| **3** | Drag-create + popup |
| **4** | Hold + block (toolbar + expirare) |
| **5** | Split mutare cameră + preț modular |
| **6** | Guests + pagină client + rebook |
| **7** | Context menu + long-press mobil |

Branch recomandat: `feature/timeline-v2`. Pilotul live (`main`) rămâne stabil.

---

## 12. Checklist decizii (închis)

- [x] Hold: expiră după X ore dacă setat; altfel doar eliberare manuală
- [x] Hold: vizibil pe Gantt
- [x] Block: vizibil pe Gantt + indisponibil calendar public
- [x] Drag-create: dreapta, bară live, popup la release
- [x] Long-press mobil = același meniu
- [x] Mutare cameră: split modular, trecut read-only
- [x] Preț: per segment / nopți
- [x] Clienți: telefon + email, matching inteligent
- [x] Prioritate faze: §11
- [ ] Drag vertical mutare cameră — amânat după faza 5
- [ ] Hold multi-cameră dintr-un singur drag — faza 2 (toolbar)

---

## Referințe cod existent

- Statusuri booking: `src/domain/booking/types.ts`
- Gantt drag orizontal: `src/components/admin/gantt/GanttDraggableStay.tsx`
- Migrare bookings: `supabase/migrations/003_bookings.sql`

Implementarea începe doar după review explicit al acestui document.
