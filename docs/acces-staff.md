# Acces staff (fără link vizibil pe site)

Site-ul public **nu** afișează „Admin” sau „Login” pentru oaspeți — ca la majoritatea site-urilor de pensiune.

## Cum intri tu

1. **Bookmark** în browser: `https://casaemil.ro/admin/login` (sau `http://localhost:3000/admin/login` la dev)
2. **Triple-click** pe logo + titlu din header → deschide login (secret staff)
3. După login: colț dreapta sus → **Recepție rapidă** | **Panou admin**

## Parolă

Cont creat cu `npm run setup-admin` — utilizator **Admin**, email Supabase `admin@casaemil.ro`.

## Securitate

- `/admin/*` și `/receptie` sunt protejate (middleware + verificare sesiune)
- Oaspeții văd doar `/`, `/calendar`, termeni, GDPR
