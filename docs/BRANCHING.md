# Branching — Stable vs Alpha

**Nu ai Git încă?** Începe cu **`docs/ghid-de-la-zero.md`**.

| Branch / tag | Versiune | Conținut |
|--------------|----------|----------|
| `main` / `stable` | **0.1.1** | Producție: admin, Gantt, istoric, prețuri, statistici |
| `v0.1.5` / `alpha` | **0.1.5-alpha** | Doar **facturare neoficială** (test) |

## Env

| Mediu | Variabilă |
|-------|-----------|
| Producție / pilot | *(omit)* sau `stable` |
| Staging test factură | `NEXT_PUBLIC_RELEASE_CHANNEL=alpha` |

## Migrări Supabase

- **Stable:** `001`–`007` (inclusiv `007_admin_activity_log.sql`)
- **Alpha:** aceleași migrări; alpha e doar flag UI pentru factură

## Documente release

- `docs/releases/v0.1.1-stable.md`
- `docs/releases/v0.1.5.md` (doar facturare)
