# Ghid complet de la zero (fără Git până acum)

Proiectul **CasaEmil** pe Desktop **nu are încă** folder `.git`. Asta e normal — îl configurezi o singură dată, apoi merge mult mai ușor.

Ordinea corectă:

1. Instalezi Git  
2. Inițializezi proiectul local + primul commit (**Stable v0.1**)  
3. Creezi branch **v0.1.5** (Alpha) cu tot ce am adăugat  
4. Supabase: migrarea **006**  
5. GitHub: repo privat + push  
6. Vercel staging + variabile env  
7. Testezi în browser  

Timp estimat prima dată: **1–2 ore** (cu pauze).

---

## Pas 0 — Ce ai nevoie

- PC cu proiectul: `C:\Users\Administrator\Desktop\CasaEmil`
- Cont [GitHub](https://github.com) (gratuit)
- Cont [Vercel](https://vercel.com) (gratuit, login cu GitHub)
- Cont [Supabase](https://supabase.com) (deja ai pentru dev/staging)
- Node instalat (`node -v` în PowerShell)

---

## Pas 1 — Instalează Git (Windows)

1. Descarcă: https://git-scm.com/download/win  
2. La instalare: lasă opțiunile default, **Git Bash** + **din PATH**.  
3. Verifică în **PowerShell**:

```powershell
git --version
```

Ar trebui să vezi ceva de genul `git version 2.x.x`.

---

## Pas 2 — Configurează numele (o singură dată)

În PowerShell (înlocuiește cu datele tale):

```powershell
git config --global user.name "Numele Tau"
git config --global user.email "emailul-tau@example.com"
```

Același email ca la GitHub e recomandat.

---

## Pas 3 — Inițializează proiectul local

```powershell
cd C:\Users\Administrator\Desktop\CasaEmil
git init
git status
```

`git status` arată fișiere **untracked** (roșu) — normal.

**Important:** `.env.local` și `.env.staging.local` **nu** intră în Git (sunt în `.gitignore`). Parolele rămân doar pe PC-ul tău.

---

## Pas 4 — Primul commit = linia **Stable (v0.1)**

Acum codul de pe disk include deja și v0.1.5. Pentru „ca la carte” ai două variante:

### Varianta A (simplă, recomandată pentru tine acum)

Un singur istoric: tot ce ai = **v0.1.5 alpha**, fără să reconstruiești v0.1 vechi.

```powershell
cd C:\Users\Administrator\Desktop\CasaEmil
git add .
git commit -m "v0.1.5-alpha: dashboard Azi, factura info, live admin, pret cladire"
git branch -M main
git checkout -b v0.1.5
```

- `main` = poți considera „stable” când vei promova  
- `v0.1.5` = branch pe care lucrezi acum (alpha)  

### Varianta B (strict Stable apoi Alpha)

Doar dacă vrei istoric perfect: mai întâi ai nevoie de o copie veche a proiectului fără v0.1.5 — complicat. **Nu e necesar** pentru staging cu prietenul.

---

## Pas 5 — Supabase (înainte sau după Git, obligatoriu)

În **fiecare** proiect Supabase folosit (dev, staging):

1. Dashboard → **SQL Editor** → New query  
2. Deschide fișierul din PC:  
   `CasaEmil\supabase\migrations\006_v015_pricing_realtime.sql`  
3. Copiază tot → **Run**  
4. Verifică: Table Editor → `buildings` are coloana `default_price_per_night`

Fără pasul ăsta: preț clădire și Realtime pot să nu meargă.

---

## Pas 6 — Fișiere env pe PC (nu pe Git)

### Dev (local)

```powershell
Copy-Item .env.example .env.local
# editează .env.local — chei Supabase DEV
```

### Staging (pentru Vercel, notezi valorile)

```powershell
Copy-Item .env.staging.example .env.staging.local
# completează chei proiect Supabase STAGING separat
```

Rulează admin staging local (opțional):

```powershell
npm run setup-admin:staging
```

---

## Pas 7 — GitHub: repo privat

1. https://github.com/new  
2. Nume: `casa-emil` (sau `CasaEmil`)  
3. **Private**  
4. **Nu** bifa „Add README” (ai deja cod local)  
5. Create repository  

GitHub îți arată comenzi — folosește pe branch-ul tău:

```powershell
cd C:\Users\Administrator\Desktop\CasaEmil
git remote add origin https://github.com/TU_USER/casa-emil.git
git push -u origin v0.1.5
git push -u origin main
```

Înlocuiește `TU_USER` cu username-ul GitHub.

Dacă cere login: folosește **Personal Access Token** (Settings → Developer settings → Tokens) ca parolă, sau GitHub Desktop.

---

## Pas 8 — Vercel (staging live)

1. https://vercel.com → **Add New Project**  
2. **Import** repo-ul `casa-emil`  
3. La **Branch**: alege **`v0.1.5`** (nu main) — asta e Alpha  
4. Framework: Next.js (auto)  
5. **Environment Variables** (Production) — copiază din `.env.staging.local`:

| Variabilă | Unde o iei |
|-----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la fel |
| `SUPABASE_SERVICE_ROLE_KEY` | la fel (secret) |
| `NEXT_PUBLIC_PENSION_NAME` | ex. `Casa Emil (test)` |
| `NEXT_PUBLIC_RELEASE_CHANNEL` | **`alpha`** |

6. **Deploy**  
7. Copiază URL: `https://casa-emil-xxx.vercel.app`

### Supabase Auth (staging)

Proiect Supabase **staging** → Authentication → URL configuration:

- **Site URL:** URL-ul Vercel de mai sus  
- **Redirect URLs:** `https://....vercel.app/**`

### Parolă admin staging

```powershell
npm run setup-admin:staging
```

---

## Pas 9 — Test „ca la carte”

Deschide în browser (staging URL):

| Ce verifici | Unde |
|-------------|------|
| Badge **Alpha Testing** | Header admin |
| **Live** sau **Auto 50s** | Colț header, se mișcă la ~50s |
| Secțiunea **Azi** | `/admin` — sosiri, plecări, de curățat |
| **Luna vs anul trecut** | `/admin` și `/admin/statistics` |
| **Preț clădire** | `/admin/buildings` — pe card clădire |
| **Factură** | Confirmă o rezervare cu camere → `/admin/bookings/[id]/factura` → Print |

Trimite prietenului: URL staging + `/admin/login` + parola din staging.

---

## Fără GitHub? (plan B, mai puțin „carte”)

Poți deploya cu **Vercel CLI** din folder, dar **nu ai branch-uri** și update-urile sunt manuale:

```powershell
npm i -g vercel
cd C:\Users\Administrator\Desktop\CasaEmil
vercel
```

Pentru staging + istoric + Alpha/Stable, **Git + GitHub merită** — e standardul industriei.

---

## Stable vs Alpha — pe înțelesul tău

| Termen | La tine în practică |
|--------|---------------------|
| **Stable** | Branch `main` + viitor `casaemil.ro` + DB client |
| **Alpha** | Branch `v0.1.5` + Vercel staging + DB test + prieten |
| **Fără branch** | Tot codul e pe disk; Git doar îl versionizează și îl urcă online |

După test: merge `v0.1.5` → `main`, tag `v0.1.5`, migrare 006 pe prod. Vezi `docs/BRANCHING.md`.

---

## Comenzi rezumat (copy-paste)

```powershell
cd C:\Users\Administrator\Desktop\CasaEmil
git init
git add .
git commit -m "v0.1.5-alpha: dashboard Azi, factura, live admin"
git branch -M main
git checkout -b v0.1.5
git remote add origin https://github.com/TU_USER/casa-emil.git
git push -u origin v0.1.5
git push -u origin main
```

Apoi: Supabase 006 → Vercel import → env `alpha` → test.

---

## Probleme frecvente

| Problemă | Soluție |
|----------|---------|
| `git nu e recunoscut` | Reinstalează Git, repornește PowerShell |
| `push` cere parolă | Token GitHub, nu parola contului |
| Login admin eșuează pe Vercel | Site URL în Supabase = URL Vercel exact |
| Nu apare „Azi” | Migrare 006 + redeploy; refresh admin |
| Live nu merge | 006 (realtime) + așteaptă 50s — tot apare auto |

Dacă vrei, următorul mesaj poate fi doar: „am instalat Git” — și îți spun exact ce îți arată `git status` pas cu pas.
