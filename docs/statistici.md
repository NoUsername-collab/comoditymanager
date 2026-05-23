# Statistici Casa Emil — fundație pe termen lung

## Principii (bulletproof)

1. **Sursa unică de adevăr**: tabelul `bookings` + `booking_rooms`. Nu se șterg rezervările pentru raportare; status `anulata` păstrează istoricul.
2. **Înregistrare de la ziua 1**: fiecare cerere are `created_at`; la confirmare se setează `confirmed_at` și opțional `total_price`.
3. **Rapoarte derivate**: statisticile se calculează la cerere din tot istoricul — nu există „gol” după un an; cu cât mai multe rezervări, cu atât mai mulți ani în grafice.
4. **Extensibil**: pagina `/admin/statistics` — comparativ ani, detaliu an, luni, pe clădire.

## Migrare

Rulează în Supabase: `supabase/migrations/005_statistics_foundation.sql`

- Indexuri pentru interogări pe ani
- Coloană `confirmed_at` (backfill pentru confirmate existente)

## KPI-uri disponibile

| Metrică | Descriere |
|--------|-----------|
| Sejururi confirmate | Rezervări `confirmata` cu sejur în an |
| Ocupare % | Cameră-nopți ocupate / capacitate anuală |
| Nopți oaspeți | Nopți de sejur (check-out exclus) |
| Cereri create | `created_at` în anul respectiv |
| Venituri RON | Sumă `total_price` (dacă e completat la confirmare) |
| Pe clădire / lună | Agregări în același motor |

## Limitare cunoscută (v1)

**Capacitatea** folosește numărul de **camere active azi** pentru toți anii din trecut. Dacă adăugați camere noi, procentele din anii vechi pot fi ușor subestimate. Viitor: snapshot zilnic camere sau istoric `room` activ/inactiv.

## Venituri complete

La confirmarea rezervării, completați **prețul total** — altfel coloana Venituri arată „—” cu mesaj în UI.

## Cod

- `src/domain/statistics/` — agregări pure (testabile)
- `src/services/statistics.ts` — încărcare din Supabase
- `src/app/admin/(panel)/statistics/page.tsx` — UI rapoarte
