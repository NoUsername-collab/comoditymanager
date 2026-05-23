# Istoric acțiuni (Stable)

Tabel: `admin_activity_log` (migrarea `007`).

## Ce se înregistrează

| Acțiune | Când |
|--------|------|
| Cerere nouă (site) | Formular public calendar |
| Confirmare / anulare | Admin pe rezervare |
| Mutare Gantt | Drag ±1 zi pe calendar |
| Clădiri / etaje / camere | CRUD admin |
| Preț implicit clădire | Formular pe card clădire |
| Setări pensiune | Salvare setări |
| Login / logout | Autentificare admin |

Actor: email admin (sau „Site public” / „Sistem”).

## UI

- **Meniu → Istoric** — ultimele ~120 evenimente
- **Rezervare → Istoric acțiuni** — evenimente pentru acea rezervare

## Limitări v1

- Nu salvează diff câmp-cu-câmp (doar `summary` + `metadata` JSON)
- Evenimentele dinainte de migrarea `007` nu apar retroactiv
