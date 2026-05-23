# Șabloane legal v0.1 — Casa Emil (PFA)

**Important:** Acest document este punct de start tehnic, nu consultanță juridică.  
Titularul PFA trebuie să completeze datele reale și, la lansare publică, să valideze textul cu contabilul sau un avocat (≈1 oră).

---

## 1. Politica de confidențialitate (publică pe site)

**URL sugerat:** `https://casaemil.ro/confidentialitate`  
**Link în footer + bifă la formularul de cerere rezervare.**

---

### Text propus (completează [ … ])

```
POLITICA DE CONFIDENȚIALITATE

Ultima actualizare: [DATA]

1. Operatorul datelor
Operatorul datelor cu caracter personal este:
[DENUMIRE PFA], PFA, titular [NUME PRENUME],
CUI [CUI], sediu [ADRESĂ COMPLETĂ], România.
Email contact: contact@casaemil.ro | Telefon: [TELEFON].

2. Ce date colectăm
Prin formularul de cerere rezervare de pe site colectăm:
- nume și prenume;
- adresă de email;
- număr de telefon;
- date de cazare dorite (check-in, check-out);
- număr de persoane (adulți/copii);
- dacă există minor însoțitor și vârsta acestuia (dacă ați bifat opțiunea);
- mesaje/note opționale.

Nu solicităm cod numeric personal (CNP) prin acest formular.

3. Scopul prelucrării
Datele sunt folosite pentru:
- primirea și analiza cererilor de rezervare/disponibilitate;
- contactarea dumneavoastră pentru confirmare sau alternative;
- administrarea sejurului după confirmare;
- îndeplinirea obligațiilor legale aplicabile operatorului.

Trimiterea cererii nu constituie confirmarea rezervării. Pensiunea vă contactează pentru confirmare.

4. Temeiul legal
Prelucrăm datele în baza:
- demersurilor premergătoare încheierii unui contract (art. 6 alin. (1) lit. b GDPR);
- interesului legitim al operatorului de a răspunde solicitărilor (art. 6 alin. (1) lit. f GDPR),
  în măsura în care nu prevalează drepturile dumneavoastră.

5. Cât timp păstrăm datele
- Cereri neconfirmate: până la [6/12] luni, apoi ștergere sau arhivare limitată.
- Rezervări confirmate: pe durata sejurului și [2] ani după, conform obligațiilor contabile/legale,
  apoi ștergere sau anonimizare unde este posibil.

6. Cui transmitem datele
Nu vindem datele. Putem folosi furnizori tehnici (împuterniciți) care stochează date în UE/SEE:
- furnizor hosting site (ex. Cloudflare);
- furnizor bază de date (ex. Supabase, regiune UE);
- furnizor email (ex. Zoho);
- servicii de notificări automate (ex. n8n pe server securizat), după caz.

Accesul la date în aplicație îl au doar persoanele autorizate de operator (administrare pensiune).

7. Securitate
Aplicăm măsuri tehnice rezonabile: conexiune criptată (HTTPS), acces restricționat,
parole pentru conturi administrative, stocare în mediu cloud cu protecții standard.

8. Drepturile dumneavoastră
Aveți dreptul de acces, rectificare, ștergere, restricționare, opoziție (în limitele legii),
portabilitate unde se aplică, și de a vă retrage consimțământul doar unde prelucrarea se bazează
pe consimțământ.

Pentru exercitarea drepturilor: contact@casaemil.ro.
Răspundem în termen de maximum 30 de zile (prelungire justificată unde legea o permite).

9. Plângeri
Puteți depune plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor
cu Caracter Personal (ANSPDCP): www.dataprotection.ro.

10. Modificări
Putem actualiza această politică; versiunea curentă este publicată pe această pagină.
```

---

## 2. Text scurt la formular (lângă butonul „Trimite cererea”)

```
Prin trimiterea formularului confirmați că ați citit
[Politica de confidențialitate](/confidentialitate).
Datele sunt folosite pentru a vă răspunde la cererea de rezervare.
Cererea nu reprezintă confirmarea automată a rezervării.
```

*(În app: checkbox obligatoriu + link.)*

---

## 3. Footer site (minim)

```
© [AN] [DENUMIRE PFA] | CUI [CUI] | [ADRESĂ] | contact@casaemil.ro | [TELEFON]
[Politica de confidențialitate] | [Contact]
```

---

## 4. Registru simplu activități prelucrare (Excel/Google Sheet — PFA îl ține)

| Activitate | Date | Scop | Temei | Destinatari | Retenție | Măsuri |
|------------|------|------|-------|-------------|----------|--------|
| Cerere rezervare site | nume, email, tel, date sejur, minor | răspuns cerere | art. 6(1)(b),(f) | Supabase UE, email Zoho | vezi politică | HTTPS, admin protejat |
| Administrare rezervări | idem + status rezervare | gestiune sejur | contract/interes legitim | Supabase | vezi politică | acces doar admin |

---

## 5. Clauze contract developer ↔ PFA (de inserat în ofertă/contract)

### 5.1 Protecția datelor (2 paragrafe)

```
X.1 Operatorul de date. Părțile confirmă că în raport cu datele cu caracter personal
introduse în aplicație de către clienții pensiunii (cereri rezervare, date contact etc.),
operator de date în sensul GDPR este exclusiv Beneficiarul ([DENUMIRE PFA], CUI [CUI]).
Prestatorul (Developerul) acționează ca persoană împuternicită/tehnică doar în măsura
în care prelucrează date pentru implementare, configurare, mentenanță și suport,
strict pe baza instrucțiunilor documentate ale Beneficiarului și în scopul executării contractului.

X.2 Măsuri și responsabilitate. Prestatorul implementează măsuri tehnice rezonabile
(HTTPS, control acces administrativ, hosting în UE unde este posibil). Beneficiarul
este responsabil pentru: politica de confidențialitate publicată pe site, informarea
persoanelor vizate, răspunsul la solicitările de exercitare a drepturilor, conținutul
comunicărilor către clienți și legalitatea prelucrărilor efectuate prin intermediul
aplicației după punerea în producție. Consultanța juridică GDPR nu este inclusă în
onorariul de dezvoltare, decât dacă este agreată separat în scris.
```

### 5.2 Alte clauze utile (scurt)

```
- Proprietate domeniu și conturi (Zoho, Supabase, Cloudflare): rămân la Beneficiar /
  pe datele Beneficiarului; Prestatorul primește acces tehnic temporar pentru dezvoltare.

- Prestatorul nu folosește date reale ale clienților în mediul de test fără acord scris.

- La încetarea contractului: export date din Supabase către Beneficiar; revocare acces
  Prestator la conturi în [X] zile.
```

---

## 6. Checklist go-live (bifează PFA + developer)

- [ ] Politică publicată + link în footer
- [ ] Checkbox + link la formular cerere
- [ ] Footer cu CUI PFA corect
- [ ] CUI completat la Host-Age (titular domeniu)
- [ ] Supabase: regiune EU (Frankfurt)
- [ ] Procedură internă: „ștergere cerere la cerere client” (email contact@)
- [ ] (Opțional) Validare text de contabil/avocat

---

## 7. Ce nu e în v0.1 (notă)

- Plăți online, facturare automată, termeni de vânzare
- Cookie banner complex (dacă doar site + formular, fără analytics agresiv — discută la lansare)
- Înregistrare la ANSPDCP — nu este „pas standard” înainte de start
